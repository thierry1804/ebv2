import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { Plus, Edit, Trash2, Upload, X, Check, Package, Layers, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Offcanvas } from '../../components/ui/Offcanvas';
import { Modal } from '../../components/ui/Modal';
import { PageLoading } from '../../components/ui/PageLoading';
import { useCategories } from '../../hooks/useCategories';
import { predefinedColors as sharedPredefinedColors } from '../../config/colors';
import { getColorNameFromHex, getHexFromColorName } from '../../config/colorNames';
import { convertToWebP } from '../../utils/imageUtils';
import {
  uploadImageToImageApi,
  isImageApiConfigured,
  isImageApiUrl,
  deleteImageFromImageApi,
  normalizeImageApiUrl,
  normalizeProductImageUrls,
} from '../../lib/imageApi';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useProductVariants } from '../../hooks/useProductVariants';
import { 
  VariantOption, 
  ProductVariant, 
  VariantOptionFormData,
  VariantFormData,
  getVariantDisplayName 
} from '../../types/variants';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { detectColorsFromImages } from '../../utils/colorDetection';
import { formatAppError, extractErrorMessage } from '../../utils/errors';
import { cn } from '../../utils/cn';

type ProductFormErrors = Partial<
  Record<'name' | 'category' | 'price' | 'stock' | 'salePrice' | 'general', string>
>;

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === 'AbortError') ||
    (typeof e === 'object' &&
      e !== null &&
      'name' in e &&
      (e as { name: string }).name === 'AbortError')
  );
}

const ADMIN_LOG = '[AdminProducts]';

/** `true` : la zone « Ou ajouter une URL » reste dans le DOM mais masquée (`hidden`). Mettre à `false` pour l’afficher. */
const HIDE_MANUAL_IMAGE_URL_FIELD = true;

/** Contexte Supabase pour le débogage (sans clé API). */
function getSupabaseEnvDebug(): { ok: boolean; host: string | null; hint: string } {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    return {
      ok: false,
      host: null,
      hint: 'Définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (build / .env)',
    };
  }
  if (url.includes('placeholder')) {
    return {
      ok: false,
      host: 'placeholder.supabase.co',
      hint: 'Client en mode placeholder — les appels REST ne sont pas valides',
    };
  }
  try {
    return { ok: true, host: new URL(url).host, hint: '' };
  } catch {
    return { ok: false, host: null, hint: 'VITE_SUPABASE_URL n’est pas une URL valide' };
  }
}

function logPostgrestLikeError(label: string, error: unknown) {
  const e = error as { message?: string; code?: string; details?: string; hint?: string; name?: string };
  console.error(`${ADMIN_LOG} ${label}`, {
    name: e?.name,
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
  });
}

export default function AdminProducts() {
  const confirm = useConfirm();
  const { adminUser } = useAdminAuth();
  const { categories } = useCategories();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    composition: '',
    stock: '',
    sizes: '',
    colors: '',
    images: [] as string[],
    isNew: false,
    isOnSale: false,
    salePrice: '',
    brand: '',
    hasVariants: false,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStep, setSaveStep] = useState<'idle' | 'database' | 'reload'>('idle');
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>({});
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingNewIds, setTogglingNewIds] = useState<Set<string>>(new Set());
  const [selectedColors, setSelectedColors] = useState<Array<{name: string, hex: string, custom: boolean}>>([]);
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#1abc9c');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHexInput, setCustomColorHexInput] = useState('#1abc9c');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  /** Noms des couleurs prédéfinies cochées dans la modal (ajout groupé). */
  const [modalPresetSelection, setModalPresetSelection] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customColorNameInputRef = useRef<HTMLInputElement>(null);
  
  // États pour la gestion des variantes
  const [isVariantsSectionOpen, setIsVariantsSectionOpen] = useState(false);
  const [isOptionModalOpen, setIsOptionModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<VariantOption | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [optionFormData, setOptionFormData] = useState<VariantOptionFormData>({
    name: '',
    values: [{ value: '' }]
  });
  const [variantFormData, setVariantFormData] = useState<VariantFormData>({
    sku: '',
    price: '',
    compareAtPrice: '',
    costPrice: '',
    stock: '0',
    weight: '',
    isAvailable: true,
    images: [],
    options: {}
  });
  const [isUploadingVariantImages, setIsUploadingVariantImages] = useState(false);
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const saveAbortRef = useRef<AbortController | null>(null);
  /** Garde synchrone : évite deux sauvegardes concurrentes (setState isSaving est asynchrone) */
  const saveInProgressRef = useRef(false);
  const nameFieldRef = useRef<HTMLInputElement>(null);
  const categoryFieldRef = useRef<HTMLSelectElement>(null);
  const priceFieldRef = useRef<HTMLInputElement>(null);
  const stockFieldRef = useRef<HTMLInputElement>(null);
  const salePriceFieldRef = useRef<HTMLInputElement>(null);

  const closeProductOffcanvas = () => {
    const saving = saveInProgressRef.current;
    if (saving) {
      console.warn(`${ADMIN_LOG} offcanvas · fermeture — annulation sauvegarde en cours`);
    }
    saveAbortRef.current?.abort();
    saveAbortRef.current = null;
    saveInProgressRef.current = false;
    setIsOffcanvasOpen(false);
    setIsSaving(false);
    setSaveStep('idle');
    setFieldErrors({});
  };

  // Hook pour les variantes
  const { 
    variants, 
    options: variantOptions, 
    isLoading: isLoadingVariants,
    saveOption,
    deleteOption,
    saveVariant,
    deleteVariant,
    generateAllVariants,
    getTotalStock,
  } = useProductVariants(editingProduct?.id || null);

  const getProductFormErrors = (): ProductFormErrors => {
    const errors: ProductFormErrors = {};
    if (!formData.name.trim()) {
      errors.name = 'Le nom du produit est obligatoire.';
    }
    if (!formData.category.trim()) {
      errors.category =
        categories.length === 0
          ? 'Aucune catégorie disponible. Créez-en une dans la page Catégories.'
          : 'Choisissez une catégorie.';
    }
    const priceNum = parseFloat(formData.price);
    if (formData.price.trim() === '' || Number.isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Indiquez un prix valide (nombre positif ou 0).';
    }
    if (!formData.hasVariants) {
      const stockRaw = formData.stock.trim();
      if (stockRaw === '') {
        errors.stock = 'Indiquez le stock (nombre entier, ex. 0 si vide en rayon).';
      } else {
        const stockNum = parseInt(stockRaw, 10);
        if (Number.isNaN(stockNum) || stockNum < 0) {
          errors.stock = 'Stock : entier positif ou 0.';
        }
      }
    }
    if (formData.isOnSale) {
      const saleRaw = formData.salePrice.trim();
      if (saleRaw === '') {
        errors.salePrice = 'Indiquez le prix promotionnel.';
      } else {
        const saleNum = parseFloat(saleRaw);
        if (Number.isNaN(saleNum) || saleNum < 0) {
          errors.salePrice = 'Prix promotionnel invalide.';
        } else if (!Number.isNaN(priceNum) && saleNum >= priceNum) {
          errors.salePrice = 'Le prix promotionnel doit être strictement inférieur au prix normal.';
        }
      }
    }
    return errors;
  };

  const scrollToFirstFieldError = (errs: ProductFormErrors) => {
    const order = ['name', 'category', 'price', 'stock', 'salePrice', 'general'] as const;
    for (const key of order) {
      if (!errs[key]) continue;
      const ref =
        key === 'name'
          ? nameFieldRef
          : key === 'category'
            ? categoryFieldRef
            : key === 'price'
              ? priceFieldRef
              : key === 'stock'
                ? stockFieldRef
                : key === 'salePrice'
                  ? salePriceFieldRef
                  : null;
      const el = ref?.current;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.requestAnimationFrame(() => el.focus());
      }
      break;
    }
  };

  const clearFieldError = (key: keyof ProductFormErrors) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Palette de couleurs prédéfinies (importée depuis la config partagée)
  const predefinedColors = sharedPredefinedColors;

  useEffect(() => {
    // Charger les produits une seule fois au montage
    loadProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    const env = getSupabaseEnvDebug();
    console.log(`${ADMIN_LOG} loadProducts · GET /rest/v1/products`, {
      supabaseOk: env.ok,
      host: env.host,
      ...(env.hint ? { attention: env.hint } : {}),
    });

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logPostgrestLikeError('loadProducts · erreur Supabase', error);
        console.warn(`${ADMIN_LOG} loadProducts · liste vide (erreur ci-dessus)`);
        setProducts([]);
      } else {
        // Adapter les données de Supabase au format Product
        const adaptedProducts = (data || []).map((p: any) => {
          // Gérer les couleurs : peut être string[] (ancien format) ou ColorWithHex[] (nouveau format)
          let colors = [];
          if (p.colors) {
            // Si c'est une chaîne JSON, la parser
            let parsedColors = p.colors;
            if (typeof p.colors === 'string') {
              try {
                parsedColors = JSON.parse(p.colors);
              } catch (e) {
                // Si ce n'est pas du JSON valide, traiter comme une liste séparée par des virgules
                parsedColors = p.colors.split(',').map((c: string) => c.trim()).filter(Boolean);
              }
            }
            
            if (Array.isArray(parsedColors) && parsedColors.length > 0) {
              // Tenter de parser chaque élément (TEXT[] contient des JSON strings)
              const decoded = parsedColors.map((c: any) => {
                if (c && typeof c === 'object' && 'name' in c && 'hex' in c) return c;
                if (typeof c === 'string') {
                  try {
                    const obj = JSON.parse(c);
                    if (obj && typeof obj === 'object' && obj.name) return obj;
                  } catch (_) { /* pas du JSON */ }
                  return c; // ancien format : simple nom de couleur
                }
                return c;
              });
              const first = decoded[0];
              if (first && typeof first === 'object' && first !== null &&
                  'name' in first && 'hex' in first) {
                colors = decoded.map((c: any) => ({
                  name: c.name || 'Couleur inconnue',
                  hex: (c.hex && /^#[0-9A-F]{6}$/i.test(c.hex)) ? c.hex.toUpperCase() : '#CCCCCC'
                }));
              } else if (typeof first === 'string') {
                colors = decoded;
              }
            }
          }
          
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            images: normalizeProductImageUrls(
              Array.isArray(p.images) ? p.images : [p.image || '']
            ).filter(Boolean),
            sizes: Array.isArray(p.sizes) ? p.sizes : [],
            colors: colors,
            description: p.description || '',
            composition: p.composition || '',
            stock: p.stock || 0,
            rating: p.rating || 0,
            reviewCount: p.review_count || 0,
            createdAt: p.created_at ?? undefined,
            isNew: p.is_new || false,
            isOnSale: p.is_on_sale || false,
            salePrice: p.sale_price ?? undefined,
            brand: p.brand ?? undefined,
            hasVariants: p.has_variants || false,
          };
        });
        setProducts(adaptedProducts);
        console.log(`${ADMIN_LOG} loadProducts · OK`, { count: adaptedProducts.length });
      }
    } catch (error: any) {
      logPostgrestLikeError('loadProducts · exception', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setFieldErrors({});
    setEditingProduct(null);
    setFormData({
      name: '',
      category: '',
      price: '',
      description: '',
      composition: '',
      stock: '',
      sizes: '',
      colors: '',
      images: [],
      isNew: false,
      isOnSale: false,
      salePrice: '',
      brand: '',
      hasVariants: false,
    });
    setSelectedColors([]);
    setSelectedColorHex('#1abc9c');
    setCustomColorHexInput('#1abc9c');
    setCustomColorName('');
    setIsVariantsSectionOpen(false);
    setIsOffcanvasOpen(true);
  };

  const handleEdit = (product: Product) => {
    setFieldErrors({});
    setEditingProduct(product);
    const colors = Array.isArray(product.colors) ? product.colors : [];
    
    // Normaliser les couleurs : supporte à la fois string[] (ancien format) et ColorWithHex[]
    const normalizedColors = colors.map((color: any) => {
      // Si c'est une chaîne, vérifier si c'est du JSON
      if (typeof color === 'string') {
        // Essayer de parser si c'est du JSON
        try {
          const parsed = JSON.parse(color);
          if (parsed && typeof parsed === 'object' && parsed.name && parsed.hex) {
            // C'est un objet JSON stringifié
            const predefined = predefinedColors.find(c => c.name === parsed.name);
            return {
              name: parsed.name,
              hex: (parsed.hex && /^#[0-9A-F]{6}$/i.test(parsed.hex)) 
                ? parsed.hex.toUpperCase() 
                : (predefined ? predefined.hex : '#CCCCCC'),
              custom: !predefined
            };
          }
        } catch (e) {
          // Ce n'est pas du JSON, c'est juste un nom de couleur
        }
        // Ancien format : juste le nom
        const predefined = predefinedColors.find(c => c.name === color);
        return predefined 
          ? { name: predefined.name, hex: predefined.hex, custom: false }
          : { name: color, hex: '#CCCCCC', custom: true };
      } else if (color && typeof color === 'object' && color.name) {
        // Nouveau format : { name, hex }
        const predefined = predefinedColors.find(c => c.name === color.name);
        // Valider et utiliser le hex si présent et valide, sinon utiliser celui de predefined ou gris
        let hexValue = '#CCCCCC';
        if (color.hex && /^#[0-9A-F]{6}$/i.test(color.hex)) {
          hexValue = color.hex.toUpperCase();
        } else if (predefined) {
          hexValue = predefined.hex;
        }
        return {
          name: color.name,
          hex: hexValue,
          custom: !predefined
        };
      } else {
        // Format inattendu
        return { name: 'Couleur inconnue', hex: '#CCCCCC', custom: true };
      }
    });
    
    // Debug
    console.log('handleEdit - Couleurs brutes:', colors);
    console.log('handleEdit - Couleurs normalisées:', normalizedColors);
    
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description,
      composition: product.composition,
      stock: product.stock.toString(),
      sizes: product.sizes.join(', '),
      colors: normalizedColors.map(c => c.name).join(', '),
      images: product.images || [],
      isNew: product.isNew || false,
      isOnSale: product.isOnSale || false,
      salePrice: product.salePrice?.toString() || '',
      brand: product.brand || '',
      hasVariants: product.hasVariants || false,
    });
    setSelectedColors(normalizedColors);
    setSelectedColorHex('#1abc9c');
    setCustomColorHexInput('#1abc9c');
    setCustomColorName('');
    setIsVariantsSectionOpen(product.hasVariants || false);
    setIsOffcanvasOpen(true);
  };


  const toggleColor = (color: { name: string; hex: string; dark: boolean }) => {
    const isSelected = selectedColors.some(c => c.name === color.name && !c.custom);
    const updatedColors = isSelected
      ? selectedColors.filter((c) => !(c.name === color.name && !c.custom))
      : [...selectedColors, { name: color.name, hex: color.hex, custom: false }];
    setSelectedColors(updatedColors);
    setFormData({ ...formData, colors: updatedColors.map(c => c.name).join(', ') });
  };

  const addCustomColor = () => {
    const colorName = customColorName.trim();
    const hex = selectedColorHex.toUpperCase();
    
    if (!colorName) {
      toast.error('Veuillez entrer un nom pour la couleur');
      return;
    }
    
    if (!/^#[0-9A-F]{6}$/i.test(hex)) {
      toast.error('Code couleur invalide. Format attendu: #RRGGBB');
      return;
    }
    
    // Vérifier si la couleur existe déjà
    const exists = selectedColors.some(c => c.name.toLowerCase() === colorName.toLowerCase());
    if (exists) {
      toast.error('Cette couleur existe déjà');
      return;
    }
    
    const newColor = { name: colorName, hex, custom: true };
    const updatedColors = [...selectedColors, newColor];
    setSelectedColors(updatedColors);
    setFormData({ ...formData, colors: updatedColors.map(c => c.name).join(', ') });
    setCustomColorName('');
    setSelectedColorHex('#1abc9c');
    setCustomColorHexInput('#1abc9c');
    toast.success(`Couleur "${colorName}" ajoutée avec succès !`);
    setTimeout(() => customColorNameInputRef.current?.focus(), 0);
  };

  const removeColor = (colorToRemove: { name: string; hex: string; custom: boolean }) => {
    const updatedColors = selectedColors.filter((c) => !(c.name === colorToRemove.name && c.hex === colorToRemove.hex));
    setSelectedColors(updatedColors);
    setFormData({ ...formData, colors: updatedColors.map(c => c.name).join(', ') });
  };

  const toggleModalPreset = (name: string) => {
    setModalPresetSelection((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAllAvailablePresetsInModal = () => {
    const names = predefinedColors
      .filter((color) => !selectedColors.some((c) => c.name === color.name && !c.custom))
      .map((c) => c.name);
    setModalPresetSelection(new Set(names));
  };

  const applyModalPresetSelection = () => {
    if (modalPresetSelection.size === 0) {
      toast.error('Sélectionnez au moins une couleur dans la grille.');
      return;
    }
    const updated = [...selectedColors];
    let added = 0;
    for (const name of modalPresetSelection) {
      const def = predefinedColors.find((c) => c.name === name);
      if (!def) continue;
      if (updated.some((c) => c.name === def.name && !c.custom)) continue;
      updated.push({ name: def.name, hex: def.hex, custom: false });
      added++;
    }
    if (added === 0) {
      toast.error('Aucune couleur nouvelle à ajouter.');
      return;
    }
    setSelectedColors(updated);
    setFormData({ ...formData, colors: updated.map((c) => c.name).join(', ') });
    setModalPresetSelection(new Set());
    toast.success(added === 1 ? '1 couleur ajoutée au produit.' : `${added} couleurs ajoutées au produit.`);
  };

  /** Upload fichier : API images si configurée, sinon repli Supabase Storage (bucket `products`), comme les catégories. */
  const handleImageUpload = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return null;
    }

    try {
      if (!adminUser) {
        toast.error('Vous devez être connecté');
        return null;
      }

      const webpFile = await convertToWebP(file);

      if (isImageApiConfigured()) {
        try {
          const apiUrl = await uploadImageToImageApi(webpFile);
          if (apiUrl) return apiUrl;
        } catch (apiErr) {
          console.warn('Upload API images échoué, repli Supabase Storage:', apiErr);
        }
      }

      const fileExt = webpFile.name.split('.').pop() || 'webp';
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
      const { error: storageError } = await supabase.storage
        .from('products')
        .upload(path, webpFile, { cacheControl: '3600', upsert: false });

      if (storageError) {
        if (storageError.message.includes('Bucket not found')) {
          toast.error(
            'Bucket Storage « products » introuvable. Créez-le dans Supabase, ou configurez VITE_IMAGE_API_BASE_URL et VITE_IMAGE_API_KEY.'
          );
        } else {
          throw storageError;
        }
        return null;
      }

      const { data: pub } = supabase.storage.from('products').getPublicUrl(path);
      return pub.publicUrl;
    } catch (error: unknown) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(formatAppError(error, 'Erreur lors de l\'upload de l\'image'));
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // Uploader tous les fichiers
      const uploadPromises = Array.from(files).map((file) => handleImageUpload(file));
      const results = await Promise.all(uploadPromises);

      // Collecter les URLs réussies
      results.forEach((url) => {
        if (url) {
          uploadedUrls.push(url);
        }
      });

      // Ajouter toutes les images en une seule fois
      if (uploadedUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
        }));
        toast.success(`${uploadedUrls.length} image(s) uploadée(s) avec succès`);

        // Détection automatique des couleurs depuis les images uploadées
        detectColorsFromImages(uploadedUrls)
          .then((detected) => {
            if (detected.length === 0) return;
            setSelectedColors((prev) => {
              const newColors = detected.filter(
                (d) => !prev.some((p) => p.name === d.name),
              );
              if (newColors.length === 0) return prev;
              toast.success(
                `Couleur(s) détectée(s) : ${newColors.map((c) => c.name).join(', ')}`,
              );
              return [
                ...prev,
                ...newColors.map((c) => ({ name: c.name, hex: c.hex, custom: false })),
              ];
            });
          })
          .catch(() => { /* silencieux si la détection échoue */ });
      } else if (files.length > 0) {
        toast.error(
          "Aucune image n'a été ajoutée. Vérifiez les messages d'erreur ci-dessus ou la configuration."
        );
      }

      // Réinitialiser l'input pour permettre de sélectionner les mêmes fichiers à nouveau
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'upload multiple:', error);
      toast.error('Erreur lors de l\'upload des images');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImageFromStorage = async (imageUrl: string, bucket: string): Promise<boolean> => {
    try {
      // Extraire le chemin du fichier depuis l'URL publique Supabase
      // Format: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
      const urlPattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+)`);
      const match = imageUrl.match(urlPattern);
      
      if (!match || !match[1]) {
        console.warn('Impossible d\'extraire le chemin du fichier depuis l\'URL:', imageUrl);
        return false;
      }

      const filePath = match[1];
      
      // Supprimer le fichier du bucket
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error);
      return false;
    }
  };

  /** Supprime un fichier distant : API images eshop ou bucket Supabase (legacy). */
  const deleteRemoteProductImage = async (rawUrl: string): Promise<void> => {
    const trimmed = typeof rawUrl === 'string' ? rawUrl.trim() : '';
    if (!trimmed) return;
    const imageUrl = normalizeImageApiUrl(trimmed);
    if (isImageApiUrl(imageUrl)) {
      await deleteImageFromImageApi(imageUrl);
      return;
    }
    if (imageUrl.includes('supabase.co/storage')) {
      await deleteImageFromStorage(imageUrl, 'products');
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = formData.images[index];

    if (imageToRemove && isImageApiUrl(imageToRemove)) {
      const deleted = await deleteImageFromImageApi(imageToRemove);
      if (deleted) {
        toast.success('Image supprimée du serveur');
      } else {
        toast.error('Erreur lors de la suppression de l\'image sur l\'API');
      }
    } else if (imageToRemove && imageToRemove.includes('supabase.co/storage')) {
      const deleted = await deleteImageFromStorage(imageToRemove, 'products');
      if (deleted) {
        toast.success('Image supprimée du stockage');
      } else {
        toast.error('Erreur lors de la suppression de l\'image du stockage');
      }
    }

    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });

    // Re-détecter les couleurs depuis les images restantes
    // et retirer celles qui ne correspondent plus (uniquement les non-custom)
    if (newImages.length > 0) {
      detectColorsFromImages(newImages)
        .then((detected) => {
          const detectedNames = new Set(detected.map((d) => d.name));
          setSelectedColors((prev) => {
            const filtered = prev.filter(
              (c) => c.custom || detectedNames.has(c.name),
            );
            const removed = prev.filter(
              (c) => !c.custom && !detectedNames.has(c.name),
            );
            if (removed.length > 0) {
              toast.success(
                `Couleur(s) retirée(s) : ${removed.map((c) => c.name).join(', ')}`,
              );
            }
            return filtered;
          });
        })
        .catch(() => {});
    } else {
      // Plus d'images → retirer toutes les couleurs auto-détectées
      setSelectedColors((prev) => {
        const autoColors = prev.filter((c) => !c.custom);
        if (autoColors.length > 0) {
          toast.success(
            `Couleur(s) retirée(s) : ${autoColors.map((c) => c.name).join(', ')}`,
          );
        }
        return prev.filter((c) => c.custom);
      });
    }
  };

  const handleSave = async () => {
    setFieldErrors({});
    const validationErrors = getProductFormErrors();
    if (Object.keys(validationErrors).length > 0) {
      console.warn(`${ADMIN_LOG} save · arrêt — validation formulaire`, validationErrors);
      setFieldErrors(validationErrors);
      scrollToFirstFieldError(validationErrors);
      toast.error('Corrigez les champs indiqués ci-dessous.', { duration: 4000 });
      return;
    }

    const priceNum = parseFloat(formData.price);
    const stockInt = formData.hasVariants
      ? 0
      : parseInt(formData.stock.trim(), 10);

    if (saveInProgressRef.current) {
      console.warn(`${ADMIN_LOG} save · ignoré — une sauvegarde est déjà en cours (garde synchrone)`);
      return;
    }
    saveInProgressRef.current = true;

    const env = getSupabaseEnvDebug();
    const mode = editingProduct ? 'update' : 'insert';
    console.log(`${ADMIN_LOG} save · démarrage`, {
      mode,
      productId: editingProduct?.id ?? null,
      adminSession: Boolean(adminUser),
      supabaseOk: env.ok,
      host: env.host,
      ...(env.hint ? { attention: env.hint } : {}),
    });
    if (!env.ok) {
      console.error(
        `${ADMIN_LOG} save · impossible d’enregistrer tant que Supabase n’est pas configuré correctement`
      );
    }
    if (!adminUser) {
      console.warn(
        `${ADMIN_LOG} save · aucune session admin détectée — les politiques RLS peuvent refuser INSERT/UPDATE`
      );
    }

    /** Évite une attente infinie si la requête réseau vers Supabase ne se termine pas */
    const SAVE_TIMEOUT_MS = 90_000;
    let saveTimeoutId: number | undefined;
    const controller = new AbortController();

    try {
      saveAbortRef.current = controller;
      setIsSaving(true);
      setSaveStep('database');
      saveTimeoutId = window.setTimeout(() => {
        console.warn(`${ADMIN_LOG} save · timeout ${SAVE_TIMEOUT_MS / 1000}s — AbortSignal déclenché`);
        controller.abort();
      }, SAVE_TIMEOUT_MS);
      const sizesArray = formData.sizes.split(',').map((s) => s.trim()).filter(Boolean);
      // Stocker les couleurs avec leur code hexadécimal (sérialisées en JSON strings pour TEXT[])
      const colorsArray = selectedColors.length > 0
        ? selectedColors.map(c => JSON.stringify({ name: c.name, hex: c.hex }))
        : formData.colors.split(',').map((c) => {
            const colorName = c.trim();
            if (!colorName) return '';
            const predefined = predefinedColors.find(pc => pc.name === colorName);
            return JSON.stringify({
              name: colorName,
              hex: predefined ? predefined.hex : '#CCCCCC'
            });
          }).filter(Boolean);
      const imagesArray = formData.images;

      const productData = {
        name: formData.name,
        category: formData.category,
        price: priceNum,
        description: formData.description,
        composition: formData.composition,
        stock: stockInt,
        sizes: sizesArray,
        colors: colorsArray,
        images: imagesArray,
        is_new: formData.isNew,
        is_on_sale: formData.isOnSale,
        sale_price:
          formData.isOnSale && formData.salePrice.trim() !== ''
            ? parseFloat(formData.salePrice)
            : null,
        brand: formData.brand || null,
        has_variants: formData.hasVariants,
      };

      console.log(`${ADMIN_LOG} save · payload (résumé)`, {
        name: productData.name,
        category: productData.category,
        price: productData.price,
        stock: productData.stock,
        imagesCount: Array.isArray(productData.images) ? productData.images.length : 0,
        colorsCount: Array.isArray(productData.colors) ? productData.colors.length : 0,
        hasVariants: productData.has_variants,
      });

      // Utiliser fetch() directement au lieu du client Supabase pour éviter
      // les blocages de connexion PostgREST sur les opérations consécutives
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const accessToken = currentSession?.access_token || supabaseAnonKey;

      if (editingProduct) {
        console.log(`${ADMIN_LOG} save · requête PATCH products`, { id: editingProduct.id });
        const patchRes = await fetch(
          `${supabaseUrl}/rest/v1/products?id=eq.${editingProduct.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${accessToken}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(productData),
            signal: controller.signal,
          },
        );
        if (!patchRes.ok) {
          const errBody = await patchRes.json().catch(() => ({}));
          throw new Error(errBody.message || `HTTP ${patchRes.status}`);
        }
        console.log(`${ADMIN_LOG} save · PATCH OK`, { id: editingProduct.id });
        toast.success('Produit modifié avec succès');
      } else {
        const clientId = crypto.randomUUID();
        console.log(`${ADMIN_LOG} save · requête POST products (id client: ${clientId})`);
        const postRes = await fetch(`${supabaseUrl}/rest/v1/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ id: clientId, ...productData }),
          signal: controller.signal,
        });
        if (!postRes.ok) {
          const errBody = await postRes.json().catch(() => ({}));
          throw new Error(errBody.message || `HTTP ${postRes.status}`);
        }

        console.log(`${ADMIN_LOG} save · POST OK`, { id: clientId, name: productData.name });

        const newProduct: Product = {
          id: clientId,
          name: productData.name,
          category: productData.category,
          price: productData.price,
          description: productData.description || '',
          composition: productData.composition || '',
          stock: productData.stock || 0,
          sizes: Array.isArray(productData.sizes) ? productData.sizes : [],
          colors: productData.colors || [],
          images: Array.isArray(productData.images) ? productData.images : [],
          rating: 0,
          reviewCount: 0,
          isNew: productData.is_new || false,
          isOnSale: productData.is_on_sale || false,
          salePrice: productData.sale_price ?? undefined,
          brand: productData.brand ?? undefined,
          hasVariants: productData.has_variants || false,
        };
        setEditingProduct(newProduct);

        toast.success('Produit créé avec succès');
      }

      setSaveStep('reload');
      console.log(`${ADMIN_LOG} save · rechargement liste (loadProducts)`);
      await loadProducts();
      console.log(`${ADMIN_LOG} save · loadProducts terminé`);

      // Ne pas fermer le panneau si on vient de créer le produit et qu'il a des variantes
      if (!editingProduct && formData.hasVariants) {
        console.log(`${ADMIN_LOG} save · panneau laissé ouvert (variantes à configurer)`);
        // Garder le panneau ouvert pour permettre d'ajouter des variantes
      } else {
        setIsOffcanvasOpen(false);
        setFieldErrors({});
        console.log(`${ADMIN_LOG} save · panneau fermé`);
      }
      console.log(`${ADMIN_LOG} save · succès complet`);
    } catch (error: unknown) {
      const errMsg = extractErrorMessage(error) ?? '';
      if (
        isAbortError(error) ||
        errMsg.includes('AbortError') ||
        errMsg.includes('user aborted')
      ) {
        console.warn(`${ADMIN_LOG} save · annulé`, { message: errMsg || String(error) });
        toast.error(
          'Enregistrement interrompu ou délai dépassé (90 s). Vérifiez la connexion et réessayez.',
          { duration: 6000 }
        );
        return;
      }
      logPostgrestLikeError('save · erreur', error);
      toast.error(formatAppError(error, 'Erreur lors de la sauvegarde'), { duration: 6000 });
    } finally {
      if (saveTimeoutId) clearTimeout(saveTimeoutId);
      saveInProgressRef.current = false;
      setIsSaving(false);
      setSaveStep('idle');
      // Ne nettoyer la ref que si c'est toujours NOTRE controller
      // (un second appel concurrent a pu le remplacer)
      if (saveAbortRef.current === controller) {
        saveAbortRef.current = null;
      }
      console.log(`${ADMIN_LOG} save · finally (état UI réinitialisé)`);
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingIds.has(id)) return;

    const ok = await confirm({
      title: 'Supprimer le produit',
      message:
        'Cette action est définitive : le produit, ses variantes et les fichiers images associés seront supprimés.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger',
    });
    if (!ok) return;

    setDeletingIds(prev => new Set(prev).add(id));
    const toastId = toast.loading('Suppression en cours…');

    try {
      const { data: productData, error: fetchError } = await supabase
        .from('products')
        .select('images')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la récupération du produit:', fetchError);
      }

      const { data: variantRows, error: variantFetchError } = await supabase
        .from('product_variants')
        .select('images')
        .eq('product_id', id);

      if (variantFetchError) {
        console.error('Erreur lors de la récupération des variantes:', variantFetchError);
      }

      const imagesToDelete: string[] = [];
      if (productData && Array.isArray(productData.images)) {
        imagesToDelete.push(...productData.images);
      }
      if (variantRows) {
        for (const row of variantRows) {
          if (Array.isArray(row.images)) {
            imagesToDelete.push(...row.images);
          }
        }
      }

      const uniqueUrls = [
        ...new Set(imagesToDelete.map((u) => String(u).trim()).filter(Boolean)),
      ];
      for (const rawUrl of uniqueUrls) {
        await deleteRemoteProductImage(rawUrl);
      }

      // Supprimer le produit de la base de données
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Produit supprimé avec succès', { id: toastId });
      loadProducts();
    } catch (error: unknown) {
      console.error('Erreur lors de la suppression:', error);
      toast.error(formatAppError(error, 'Erreur lors de la suppression'), { id: toastId });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleToggleIsNew = async (product: Product, checked: boolean) => {
    if (togglingNewIds.has(product.id)) return;
    setTogglingNewIds((prev) => new Set(prev).add(product.id));
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_new: checked })
        .eq('id', product.id);
      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isNew: checked } : p))
      );
      if (editingProduct?.id === product.id) {
        setFormData((fd) => ({ ...fd, isNew: checked }));
      }
      toast.success(checked ? 'Produit marqué comme nouveauté' : 'Nouveauté désactivée');
    } catch (error: unknown) {
      console.error('Erreur lors de la mise à jour nouveauté:', error);
      toast.error(formatAppError(error, 'Impossible de mettre à jour la nouveauté'));
    } finally {
      setTogglingNewIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Produits</h1>
        <Button
          onClick={handleCreate}
          className="bg-secondary hover:bg-secondary/90"
          aria-label="Nouveau produit"
        >
          <Plus size={20} />
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Prix
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Stock
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Créé le
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nouveauté
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  Aucun produit trouvé. Créez une table "products" dans Supabase.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const isDeleting = deletingIds.has(product.id);
                const isTogglingNew = togglingNewIds.has(product.id);
                return (
                <tr
                  key={product.id}
                  className={`transition-[opacity,background-color] duration-200 ease-out hover:bg-gray-50 ${
                    isDeleting ? 'bg-amber-50/90 opacity-75 pointer-events-none' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-dark flex items-center gap-2">
                      {isDeleting && (
                        <Loader2
                          className="shrink-0 animate-spin text-amber-700"
                          size={16}
                          aria-hidden
                        />
                      )}
                      <span>{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                  <td className="px-6 py-4">
                    <div className="text-text-dark font-medium">
                      {product.isOnSale && product.salePrice ? (
                        <>
                          <span className="text-red-600">{product.salePrice.toLocaleString()} MGA</span>
                          <span className="text-gray-400 line-through ml-2 text-sm">
                            {product.price.toLocaleString()} MGA
                          </span>
                        </>
                      ) : (
                        <span>{product.price.toLocaleString()} MGA</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        product.stock > 0
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.stock} en stock
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {product.createdAt
                      ? new Date(product.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-secondary focus:ring-secondary"
                        checked={!!product.isNew}
                        disabled={isDeleting || isTogglingNew}
                        onChange={(e) => handleToggleIsNew(product, e.target.checked)}
                        aria-label={
                          product.isNew
                            ? 'Désactiver la nouveauté'
                            : 'Activer comme nouveauté'
                        }
                      />
                      {isTogglingNew && (
                        <Loader2 className="animate-spin text-gray-500" size={14} aria-hidden />
                      )}
                    </label>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        disabled={isDeleting}
                        className="p-2 text-blue-600 hover:text-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product.id)}
                        disabled={isDeleting}
                        className="p-2 text-red-600 hover:text-red-900 disabled:opacity-40 disabled:cursor-not-allowed min-w-[42px] min-h-[42px] inline-flex items-center justify-center"
                        title={isDeleting ? 'Suppression…' : 'Supprimer'}
                        aria-busy={isDeleting}
                        aria-label={isDeleting ? 'Suppression en cours' : 'Supprimer le produit'}
                      >
                        {isDeleting ? (
                          <Loader2 className="animate-spin" size={18} aria-hidden />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={closeProductOffcanvas}
        title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
        position="right"
        width="xl"
        footer={
          <div className="flex flex-col gap-3">
            {isSaving && (
              <div
                className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800"
                aria-live="polite"
              >
                <ol className="space-y-2 list-none m-0 p-0">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden />
                    <span>Champs validés</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {saveStep === 'database' ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin text-gray-600" aria-hidden />
                    ) : (
                      <Check className="w-4 h-4 shrink-0 text-emerald-700" aria-hidden />
                    )}
                    <span>Enregistrement sur le serveur</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {saveStep === 'reload' ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin text-gray-600" aria-hidden />
                    ) : (
                      <span
                        className="w-4 h-4 shrink-0 inline-block rounded-sm border border-gray-300"
                        aria-hidden
                      />
                    )}
                    <span className={saveStep === 'reload' ? 'text-gray-900' : 'text-gray-500'}>
                      Mise à jour de la liste
                    </span>
                  </li>
                </ol>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                onClick={closeProductOffcanvas}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto"
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-secondary hover:bg-secondary/90 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin shrink-0" size={18} aria-hidden />
                    <span>
                      {saveStep === 'reload' ? 'Actualisation de la liste…' : 'Enregistrement…'}
                    </span>
                  </>
                ) : editingProduct ? (
                  'Modifier'
                ) : (
                  'Créer'
                )}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {Object.keys(fieldErrors).length > 0 && (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
              role="alert"
            >
              {fieldErrors.general ??
                'Certains champs sont invalides ou incomplets. Vérifiez les messages sous chaque champ.'}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="admin-product-name">
                Nom *
              </label>
              <input
                ref={nameFieldRef}
                id="admin-product-name"
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  clearFieldError('name');
                }}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'admin-product-name-error' : undefined}
                autoComplete="off"
                className={cn(
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary',
                  fieldErrors.name ? 'border-red-600' : 'border-gray-300'
                )}
              />
              {fieldErrors.name && (
                <p id="admin-product-name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="admin-product-category">
                Catégorie *
              </label>
              <select
                ref={categoryFieldRef}
                id="admin-product-category"
                value={formData.category}
                onChange={(e) => {
                  setFormData({ ...formData, category: e.target.value });
                  clearFieldError('category');
                }}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-describedby={fieldErrors.category ? 'admin-product-category-error' : undefined}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary',
                  fieldErrors.category ? 'border-red-600' : 'border-gray-300'
                )}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.category && (
                <p id="admin-product-category-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.category}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="admin-product-price">
                Prix (MGA) *
              </label>
              <input
                ref={priceFieldRef}
                id="admin-product-price"
                type="number"
                min={0}
                step="any"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: e.target.value });
                  clearFieldError('price');
                }}
                aria-invalid={Boolean(fieldErrors.price)}
                aria-describedby={fieldErrors.price ? 'admin-product-price-error' : undefined}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary',
                  fieldErrors.price ? 'border-red-600' : 'border-gray-300'
                )}
              />
              {fieldErrors.price && (
                <p id="admin-product-price-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.price}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="admin-product-stock">
                Stock{formData.hasVariants ? ' (variantes)' : ''}
              </label>
              <input
                ref={stockFieldRef}
                id="admin-product-stock"
                type="number"
                min={0}
                step={1}
                value={formData.stock}
                onChange={(e) => {
                  setFormData({ ...formData, stock: e.target.value });
                  clearFieldError('stock');
                }}
                disabled={formData.hasVariants}
                aria-invalid={Boolean(fieldErrors.stock)}
                aria-describedby={fieldErrors.stock ? 'admin-product-stock-error' : undefined}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary',
                  fieldErrors.stock ? 'border-red-600' : 'border-gray-300',
                  formData.hasVariants && 'bg-gray-100 text-gray-600 cursor-not-allowed'
                )}
              />
              {fieldErrors.stock && (
                <p id="admin-product-stock-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.stock}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Composition</label>
            <textarea
              value={formData.composition}
              onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tailles (séparées par des virgules)
              </label>
              <input
                type="text"
                value={formData.sizes}
                onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                placeholder="S, M, L, XL"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Couleurs
              </label>
              
              {/* Palette de couleurs */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-1.5 items-center">
                  {/* Couleurs sélectionnées - Afficher toutes les couleurs sélectionnées avec leur hex */}
                  {selectedColors.length > 0 ? (
                    selectedColors.map((selectedColor) => {
                      // Trouver la couleur prédéfinie correspondante si elle existe
                      const predefinedColor = predefinedColors.find(c => c.name === selectedColor.name);
                      // Utiliser le hex de selectedColor en priorité, sinon celui de predefinedColor, sinon gris par défaut
                      const displayHex = (selectedColor.hex && /^#[0-9A-F]{6}$/i.test(selectedColor.hex))
                        ? selectedColor.hex 
                        : (predefinedColor?.hex || '#CCCCCC');
                      // Calculer si la couleur est sombre pour le contraste du checkmark
                      const hexValue = displayHex.replace('#', '');
                      const r = parseInt(hexValue.substr(0, 2), 16);
                      const g = parseInt(hexValue.substr(2, 2), 16);
                      const b = parseInt(hexValue.substr(4, 2), 16);
                      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                      const isDark = brightness < 128;
                      
                      return (
                        <div
                          key={`${selectedColor.name}-${selectedColor.hex || 'no-hex'}`}
                          className="relative group"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (predefinedColor) {
                                toggleColor(predefinedColor);
                              } else {
                                removeColor(selectedColor);
                              }
                            }}
                            className="relative w-8 h-8 rounded-full transition-all duration-300 border-2 border-gray-200 hover:border-gray-400"
                            style={{ 
                              backgroundColor: displayHex,
                              background: displayHex
                            }}
                            title={`${selectedColor.name} (${displayHex})`}
                          >
                            <Check 
                              size={12} 
                              className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] ${
                                isDark ? 'text-white' : 'text-gray-800'
                              }`}
                            />
                          </button>
                          {selectedColor.custom && (
                            <button
                              type="button"
                              onClick={() => removeColor(selectedColor)}
                              className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold hover:bg-red-600 z-10"
                              title="Supprimer cette couleur"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-gray-500 italic">Aucune couleur sélectionnée</span>
                  )}
                  
                  {/* Bouton pour ouvrir la modal */}
                  <button
                    type="button"
                    onClick={() => setIsColorModalOpen(true)}
                    className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400 hover:border-gray-600 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center text-gray-500 hover:text-gray-700"
                    title="Ajouter des couleurs"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Modal pour les couleurs non sélectionnées et l'ajout personnalisé */}
              <Modal
                isOpen={isColorModalOpen}
                onClose={() => {
                  setModalPresetSelection(new Set());
                  setIsColorModalOpen(false);
                }}
                title="Ajouter des couleurs"
                size="md"
                showBackdrop={false}
                draggable={true}
              >
                <div className="space-y-6">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Couleurs prédéfinies</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cliquez pour sélectionner une ou plusieurs couleurs, puis validez en une fois.
                        </p>
                      </div>
                      {predefinedColors.some(
                        (c) => !selectedColors.some((s) => s.name === c.name && !s.custom)
                      ) && (
                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={selectAllAvailablePresetsInModal}
                            className="text-xs text-secondary font-medium hover:underline"
                          >
                            Tout sélectionner
                          </button>
                          <span className="text-gray-300" aria-hidden>
                            |
                          </span>
                          <button
                            type="button"
                            onClick={() => setModalPresetSelection(new Set())}
                            className="text-xs text-gray-600 font-medium hover:underline"
                            disabled={modalPresetSelection.size === 0}
                          >
                            Effacer la sélection
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {predefinedColors
                        .filter((color) => !selectedColors.some((c) => c.name === color.name && !c.custom))
                        .map((color) => {
                          const isPicked = modalPresetSelection.has(color.name);
                          const hexValue = color.hex.replace('#', '');
                          const r = parseInt(hexValue.slice(0, 2), 16);
                          const g = parseInt(hexValue.slice(2, 4), 16);
                          const b = parseInt(hexValue.slice(4, 6), 16);
                          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                          const checkContrast = brightness < 140 ? 'text-white' : 'text-gray-900';
                          return (
                            <button
                              key={color.name}
                              type="button"
                              aria-pressed={isPicked}
                              onClick={() => toggleModalPreset(color.name)}
                              className={cn(
                                'relative w-9 h-9 rounded-full border-2 transition-colors duration-150',
                                isPicked ? 'border-gray-800' : 'border-gray-200 hover:border-gray-400',
                                color.name === 'Blanc' && !isPicked && 'border-gray-300'
                              )}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            >
                              {isPicked && (
                                <Check
                                  size={14}
                                  className={cn(
                                    'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm',
                                    checkContrast
                                  )}
                                  strokeWidth={2.5}
                                />
                              )}
                            </button>
                          );
                        })}
                    </div>
                    {predefinedColors.every((c) =>
                      selectedColors.some((s) => s.name === c.name && !s.custom)
                    ) ? (
                      <p className="text-xs text-gray-500 mt-3">Toutes les couleurs prédéfinies sont déjà sur le produit.</p>
                    ) : null}
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      className="w-full mt-4"
                      onClick={applyModalPresetSelection}
                      disabled={modalPresetSelection.size === 0}
                    >
                      {modalPresetSelection.size === 0
                        ? 'Ajouter les couleurs sélectionnées'
                        : `Ajouter ${modalPresetSelection.size} couleur${modalPresetSelection.size > 1 ? 's' : ''} au produit`}
                    </Button>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-800 mb-1">Couleur personnalisée</p>
                    <p className="text-xs text-gray-500 mb-3">
                      Si le nom correspond à une couleur connue (ex. Turquoise, Corail), le code et l’aperçu se mettent à jour. Sinon, ajustez le hex ou le nuancier. Vous pouvez en ajouter plusieurs sans fermer la fenêtre.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1.5">Nom de la couleur</label>
                        <input
                          ref={customColorNameInputRef}
                          type="text"
                          value={customColorName}
                          onChange={(e) => {
                            const name = e.target.value;
                            setCustomColorName(name);
                            const resolved = getHexFromColorName(name);
                            if (resolved) {
                              setSelectedColorHex(resolved);
                              setCustomColorHexInput(resolved);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomColor();
                            }
                          }}
                          placeholder="Ex: Turquoise, Corail, Menthe..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1.5">Code couleur</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={selectedColorHex}
                            onChange={(e) => {
                              const newHex = e.target.value;
                              setSelectedColorHex(newHex);
                              setCustomColorHexInput(newHex);
                              setCustomColorName(getColorNameFromHex(newHex));
                            }}
                            className="w-14 h-11 border border-gray-300 rounded-lg cursor-pointer"
                            title="Choisir une couleur"
                          />
                          <input
                            type="text"
                            value={customColorHexInput}
                            onChange={(e) => {
                              const hex = e.target.value;
                              setCustomColorHexInput(hex);
                              if (/^#[0-9A-F]{6}$/i.test(hex)) {
                                setSelectedColorHex(hex);
                                setCustomColorName(getColorNameFromHex(hex));
                              }
                            }}
                            placeholder="#000000"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary text-sm font-mono"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        className="w-full inline-flex items-center justify-center gap-2"
                        onClick={() => addCustomColor()}
                        disabled={!customColorName.trim()}
                      >
                        <Plus size={18} aria-hidden />
                        Ajouter cette couleur
                      </Button>
                    </div>
                  </div>
                </div>
              </Modal>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
            
            {/* Upload de fichiers */}
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="images-upload"
              />
              <label
                htmlFor="images-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg transition-colors ${
                  isUploading
                    ? 'cursor-wait opacity-80 pointer-events-none'
                    : 'hover:bg-gray-200 cursor-pointer'
                }`}
              >
                {isUploading ? (
                  <Loader2 className="animate-spin shrink-0" size={18} aria-hidden />
                ) : (
                  <Upload size={18} aria-hidden />
                )}
                {isUploading ? 'Traitement des images…' : 'Uploader des images'}
              </label>
            </div>

            {/* URLs manuelles — masquées visuellement si HIDE_MANUAL_IMAGE_URL_FIELD */}
            <div
              className={cn('mb-2', HIDE_MANUAL_IMAGE_URL_FIELD && 'hidden')}
              aria-hidden={HIDE_MANUAL_IMAGE_URL_FIELD}
            >
              <label className="block text-xs text-gray-600 mb-1">Ou ajouter une URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="admin-product-manual-image-url"
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        setFormData({ ...formData, images: [...formData.images, input.value.trim()] });
                        input.value = '';
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      'admin-product-manual-image-url'
                    ) as HTMLInputElement | null;
                    if (input?.value.trim()) {
                      setFormData({ ...formData, images: [...formData.images, input.value.trim()] });
                      input.value = '';
                    }
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto"
                >
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Liste des images */}
            {formData.images.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs text-gray-600 mb-2">Images ajoutées ({formData.images.length})</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isNew"
                checked={formData.isNew}
                onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isNew" className="text-sm text-gray-700">
                Nouveau produit
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isOnSale"
                checked={formData.isOnSale}
                onChange={(e) => {
                  setFormData({ ...formData, isOnSale: e.target.checked });
                  clearFieldError('salePrice');
                }}
                className="mr-2"
              />
              <label htmlFor="isOnSale" className="text-sm text-gray-700">
                En promotion
              </label>
            </div>
          </div>
          {formData.isOnSale && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="admin-product-sale-price">
                Prix promotionnel (MGA) *
              </label>
              <input
                ref={salePriceFieldRef}
                id="admin-product-sale-price"
                type="number"
                min={0}
                step="any"
                value={formData.salePrice}
                onChange={(e) => {
                  setFormData({ ...formData, salePrice: e.target.value });
                  clearFieldError('salePrice');
                }}
                aria-invalid={Boolean(fieldErrors.salePrice)}
                aria-describedby={fieldErrors.salePrice ? 'admin-product-sale-price-error' : undefined}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-secondary',
                  fieldErrors.salePrice ? 'border-red-600' : 'border-gray-300'
                )}
              />
              {fieldErrors.salePrice && (
                <p id="admin-product-sale-price-error" className="mt-1 text-sm text-red-600" role="alert">
                  {fieldErrors.salePrice}
                </p>
              )}
            </div>
          )}

          {/* Section Variantes */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Layers size={20} className="text-gray-600" />
                <label htmlFor="hasVariants" className="text-sm font-medium text-gray-700">
                  Ce produit a des variantes
                </label>
                <input
                  type="checkbox"
                  id="hasVariants"
                  checked={formData.hasVariants}
                  onChange={(e) => {
                    setFormData({ ...formData, hasVariants: e.target.checked });
                    clearFieldError('stock');
                    if (e.target.checked) {
                      setIsVariantsSectionOpen(true);
                    }
                  }}
                  className="w-5 h-5 text-secondary border-gray-300 rounded focus:ring-secondary"
                />
              </div>
              {formData.hasVariants && (
                <button
                  type="button"
                  onClick={() => setIsVariantsSectionOpen(!isVariantsSectionOpen)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isVariantsSectionOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              )}
            </div>

            {formData.hasVariants && isVariantsSectionOpen && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {!editingProduct && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    Le produit sera enregistré automatiquement lorsque vous ajouterez une option.
                  </p>
                )}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Options (ex: Taille, Couleur)</h4>
                    <Button
                      onClick={async () => {
                        // Si le produit n'est pas encore enregistré, le sauvegarder d'abord
                        if (!editingProduct) {
                          await handleSave();
                          // handleSave met à jour editingProduct via setEditingProduct
                          // On ouvre la modal après un court délai pour laisser le state se mettre à jour
                          setTimeout(() => {
                            setEditingOption(null);
                            setOptionFormData({ name: '', values: [{ value: '' }] });
                            setIsOptionModalOpen(true);
                          }, 300);
                          return;
                        }
                        setEditingOption(null);
                        setOptionFormData({ name: '', values: [{ value: '' }] });
                        setIsOptionModalOpen(true);
                      }}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1"
                    >
                      <Plus size={14} className="mr-1" />
                      Ajouter une option
                    </Button>
                  </div>
                  
                  {isLoadingVariants ? (
                    <p className="text-sm text-gray-500">Chargement...</p>
                  ) : variantOptions.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Aucune option définie. Ajoutez des options pour créer des variantes.</p>
                  ) : (
                    <div className="space-y-2">
                      {variantOptions.map((option) => (
                        <div key={option.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                          <div>
                            <span className="font-medium text-gray-800">{option.name}</span>
                            <span className="text-gray-500 text-sm ml-2">
                              ({option.values.map(v => v.value).join(', ')})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOption(option);
                                setOptionFormData({
                                  id: option.id,
                                  name: option.name,
                                  values: option.values.map(v => ({ 
                                    id: v.id, 
                                    value: v.value, 
                                    hexColor: v.hexColor 
                                  }))
                                });
                                setIsOptionModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const accepted = await confirm({
                                  title: 'Supprimer l’option',
                                  message:
                                    'Les variantes qui utilisent cette option peuvent être affectées. Continuer ?',
                                  confirmLabel: 'Supprimer',
                                  cancelLabel: 'Annuler',
                                  variant: 'danger',
                                });
                                if (!accepted) return;
                                await deleteOption(option.id);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {/* Variantes */}
                {variantOptions.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Variantes ({variants.length})
                        {variants.length > 0 && (
                          <span className="font-normal text-gray-500 ml-2">
                            Stock total: {getTotalStock()}
                          </span>
                        )}
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            if (editingProduct) {
                              await generateAllVariants(editingProduct.id, parseFloat(formData.price) || 0);
                            }
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1"
                        >
                          <Package size={14} className="mr-1" />
                          Générer toutes
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingVariant(null);
                            setVariantFormData({
                              sku: '',
                              price: '',
                              compareAtPrice: '',
                              costPrice: '',
                              stock: '0',
                              weight: '',
                              isAvailable: true,
                              images: [],
                              options: {}
                            });
                            setIsVariantModalOpen(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1"
                        >
                          <Plus size={14} className="mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    </div>

                    {variants.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Aucune variante. Cliquez sur "Générer toutes" pour créer automatiquement les combinaisons.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-3 py-2 text-left">Variante</th>
                              <th className="px-3 py-2 text-left">SKU</th>
                              <th className="px-3 py-2 text-right">Prix</th>
                              <th className="px-3 py-2 text-right">Stock</th>
                              <th className="px-3 py-2 text-center">Dispo</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {variants.map((variant) => (
                              <tr key={variant.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {variant.options.some(o => o.hexColor) && (
                                      <span 
                                        className="w-4 h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: variant.options.find(o => o.hexColor)?.hexColor }}
                                      />
                                    )}
                                    {getVariantDisplayName(variant)}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-gray-600">{variant.sku || '-'}</td>
                                <td className="px-3 py-2 text-right">
                                  {variant.price ? `${variant.price.toLocaleString()} MGA` : 'Prix de base'}
                                </td>
                                <td className="px-3 py-2 text-right">{variant.stock}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`inline-block w-3 h-3 rounded-full ${variant.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingVariant(variant);
                                        setVariantFormData({
                                          id: variant.id,
                                          sku: variant.sku || '',
                                          price: variant.price?.toString() || '',
                                          compareAtPrice: variant.compareAtPrice?.toString() || '',
                                          costPrice: variant.costPrice?.toString() || '',
                                          stock: variant.stock.toString(),
                                          weight: variant.weight?.toString() || '',
                                          isAvailable: variant.isAvailable,
                                          images: variant.images || [],
                                          options: variant.options.reduce((acc, o) => {
                                            acc[o.optionId] = o.valueId;
                                            return acc;
                                          }, {} as Record<string, string>)
                                        });
                                        setIsVariantModalOpen(true);
                                      }}
                                      className="p-1 text-blue-600 hover:text-blue-800"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const accepted = await confirm({
                                          title: 'Supprimer la variante',
                                          message: 'Cette variante sera supprimée définitivement.',
                                          confirmLabel: 'Supprimer',
                                          cancelLabel: 'Annuler',
                                          variant: 'danger',
                                        });
                                        if (!accepted) return;
                                        await deleteVariant(variant.id);
                                      }}
                                      className="p-1 text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Offcanvas>

      {/* Modal pour ajouter/modifier une option */}
      <Modal
        isOpen={isOptionModalOpen}
        onClose={() => setIsOptionModalOpen(false)}
        title={editingOption ? 'Modifier l\'option' : 'Ajouter une option'}
        size="md"
      >
        {!editingProduct && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              ⚠️ Veuillez d'abord enregistrer le produit avant d'ajouter des options.
            </p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom de l'option *
            </label>
            <input
              type="text"
              value={optionFormData.name}
              onChange={(e) => setOptionFormData({ ...optionFormData, name: e.target.value })}
              placeholder="Ex: Taille, Couleur, Matière..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valeurs *
            </label>
            
            {/* Palette de couleurs prédéfinies si c'est une option Couleur */}
            {optionFormData.name.toLowerCase().includes('couleur') && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-2 font-semibold uppercase tracking-wide">
                  Couleurs prédéfinies
                </p>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => {
                    // Obtenir le nom de la couleur depuis la base de données
                    const colorName = getColorNameFromHex(color.hex);
                    const alreadyAdded = optionFormData.values.some(
                      v => v.value.toLowerCase() === colorName.toLowerCase()
                    );
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          if (!alreadyAdded) {
                            // Chercher un champ vide pour le remplir, sinon ajouter une nouvelle ligne
                            const emptyIndex = optionFormData.values.findIndex(v => !v.value || !v.value.trim());
                            
                            const newValues = [...optionFormData.values];
                            
                            if (emptyIndex !== -1) {
                              // Remplir le champ vide avec le nom depuis colorNames
                              newValues[emptyIndex] = { 
                                ...newValues[emptyIndex],
                                value: colorName, 
                                hexColor: color.hex 
                              };
                            } else {
                              // Ajouter une nouvelle ligne avec le nom depuis colorNames
                              newValues.push({ value: colorName, hexColor: color.hex });
                            }
                            
                            // Mettre à jour l'état avec un nouvel objet pour forcer le re-render
                            setOptionFormData(prev => ({
                              ...prev,
                              values: newValues
                            }));
                            
                            toast.success(`Couleur "${colorName}" ajoutée`);
                          } else {
                            toast.error(`La couleur "${colorName}" est déjà ajoutée`);
                          }
                        }}
                        disabled={alreadyAdded}
                        className={`
                          relative w-10 h-10 rounded-full border-2 transition-all
                          ${alreadyAdded 
                            ? 'opacity-50 cursor-not-allowed border-gray-300' 
                            : 'border-gray-300 hover:border-gray-500 hover:scale-110 hover:shadow-lg'
                          }
                        `}
                        style={{ backgroundColor: color.hex }}
                        title={alreadyAdded ? `${colorName} (déjà ajoutée)` : `Ajouter ${colorName}`}
                      >
                        {alreadyAdded && (
                          <Check 
                            size={14} 
                            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                              color.dark ? 'text-white' : 'text-gray-800'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Cliquez sur une couleur pour l'ajouter automatiquement avec son code hex
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              {optionFormData.values.map((val, index) => (
                <div key={`${val.value}-${val.hexColor || ''}-${index}`} className="flex gap-2">
                  <input
                    type="text"
                    value={val.value || ''}
                    onChange={(e) => {
                      const newValues = [...optionFormData.values];
                      newValues[index] = { ...newValues[index], value: e.target.value };
                      setOptionFormData(prev => ({ ...prev, values: newValues }));
                    }}
                    placeholder="Ex: S, M, L ou Rouge, Bleu..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary text-sm"
                  />
                  {optionFormData.name.toLowerCase().includes('couleur') && (
                    <input
                      type="color"
                      value={val.hexColor || '#cccccc'}
                      onChange={(e) => {
                        const newHex = e.target.value.toUpperCase();
                        const colorName = getColorNameFromHex(newHex);
                        const newValues = [...optionFormData.values];
                        newValues[index] = { 
                          ...newValues[index], 
                          hexColor: newHex,
                          value: colorName // Remplir automatiquement le nom
                        };
                        setOptionFormData(prev => ({ ...prev, values: newValues }));
                      }}
                      className="w-10 h-10 border border-gray-300 rounded-lg cursor-pointer"
                    />
                  )}
                  {optionFormData.values.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newValues = optionFormData.values.filter((_, i) => i !== index);
                        setOptionFormData({ ...optionFormData, values: newValues });
                      }}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setOptionFormData({
                  ...optionFormData,
                  values: [...optionFormData.values, { value: '' }]
                });
              }}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus size={14} />
              Ajouter une valeur
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => setIsOptionModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                // Vérifier que le produit est sauvegardé
                if (!editingProduct || !editingProduct.id) {
                  toast.error('Veuillez d\'abord enregistrer le produit avant d\'ajouter des options');
                  setIsOptionModalOpen(false);
                  return;
                }
                
                console.log('Ajout option - editingProduct.id:', editingProduct.id);
                console.log('Ajout option - optionFormData:', optionFormData);
                
                if (!optionFormData.name.trim()) {
                  toast.error('Le nom de l\'option est requis');
                  return;
                }
                const validValues = optionFormData.values.filter(v => v.value.trim());
                if (validValues.length === 0) {
                  toast.error('Ajoutez au moins une valeur');
                  return;
                }
                
                console.log('Appel saveOption avec:', {
                  ...optionFormData,
                  values: validValues,
                  productId: editingProduct.id
                });
                
                // Passer explicitement le productId pour éviter les problèmes de timing
                const result = await saveOption({
                  ...optionFormData,
                  values: validValues
                }, editingProduct.id);
                
                console.log('Résultat saveOption:', result);
                
                if (result) {
                  setIsOptionModalOpen(false);
                  // Réinitialiser le formulaire
                  setOptionFormData({ name: '', values: [{ value: '' }] });
                }
              }}
              className="bg-secondary hover:bg-secondary/90"
            >
              {editingOption ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal pour ajouter/modifier une variante */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title={editingVariant ? 'Modifier la variante' : 'Ajouter une variante'}
        size="lg"
      >
        <div className="space-y-4">
          {/* Sélection des options */}
          <div className="grid grid-cols-2 gap-4">
            {variantOptions.map((option) => (
              <div key={option.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {option.name} *
                </label>
                <select
                  value={variantFormData.options[option.id] || ''}
                  onChange={(e) => {
                    setVariantFormData({
                      ...variantFormData,
                      options: { ...variantFormData.options, [option.id]: e.target.value }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                >
                  <option value="">Sélectionner...</option>
                  {option.values.map((val) => (
                    <option key={val.id} value={val.id}>
                      {val.value}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={variantFormData.sku}
                onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                placeholder="Code article unique"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
              <input
                type="number"
                value={variantFormData.stock}
                onChange={(e) => setVariantFormData({ ...variantFormData, stock: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix (MGA)
                <span className="font-normal text-gray-500 text-xs ml-1">(vide = prix de base)</span>
              </label>
              <input
                type="number"
                value={variantFormData.price}
                onChange={(e) => setVariantFormData({ ...variantFormData, price: e.target.value })}
                placeholder={formData.price}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix barré</label>
              <input
                type="number"
                value={variantFormData.compareAtPrice}
                onChange={(e) => setVariantFormData({ ...variantFormData, compareAtPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coût d'achat</label>
              <input
                type="number"
                value={variantFormData.costPrice}
                onChange={(e) => setVariantFormData({ ...variantFormData, costPrice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poids (g)</label>
              <input
                type="number"
                value={variantFormData.weight}
                onChange={(e) => setVariantFormData({ ...variantFormData, weight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="variantAvailable"
                checked={variantFormData.isAvailable}
                onChange={(e) => setVariantFormData({ ...variantFormData, isAvailable: e.target.checked })}
                className="mr-2 w-5 h-5"
              />
              <label htmlFor="variantAvailable" className="text-sm text-gray-700">
                Disponible à la vente
              </label>
            </div>
          </div>

          {/* Images de la variante */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
            
            {/* Upload de fichiers */}
            <div className="mb-3">
              <input
                ref={variantFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;

                  setIsUploadingVariantImages(true);
                  const uploadedUrls: string[] = [];

                  try {
                    const uploadPromises = Array.from(files).map((file) => handleImageUpload(file));
                    const results = await Promise.all(uploadPromises);

                    results.forEach((url) => {
                      if (url) {
                        uploadedUrls.push(url);
                      }
                    });

                    if (uploadedUrls.length > 0) {
                      setVariantFormData((prev) => ({
                        ...prev,
                        images: [...prev.images, ...uploadedUrls],
                      }));
                      toast.success(`${uploadedUrls.length} image(s) uploadée(s) avec succès`);
                    } else if (files.length > 0) {
                      toast.error(
                        "Aucune image n'a été ajoutée. Vérifiez les messages d'erreur ou la configuration."
                      );
                    }

                    if (variantFileInputRef.current) {
                      variantFileInputRef.current.value = '';
                    }
                  } catch (error: any) {
                    console.error('Erreur lors de l\'upload multiple:', error);
                    toast.error('Erreur lors de l\'upload des images');
                  } finally {
                    setIsUploadingVariantImages(false);
                  }
                }}
                className="hidden"
                id="variant-images-upload"
              />
              <label
                htmlFor="variant-images-upload"
                className={`inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg transition-colors ${
                  isUploadingVariantImages
                    ? 'cursor-wait opacity-80 pointer-events-none'
                    : 'hover:bg-gray-200 cursor-pointer'
                }`}
              >
                {isUploadingVariantImages ? (
                  <Loader2 className="animate-spin shrink-0" size={18} aria-hidden />
                ) : (
                  <Upload size={18} aria-hidden />
                )}
                {isUploadingVariantImages ? 'Traitement des images…' : 'Uploader des images'}
              </label>
            </div>

            <div
              className={cn('mb-2', HIDE_MANUAL_IMAGE_URL_FIELD && 'hidden')}
              aria-hidden={HIDE_MANUAL_IMAGE_URL_FIELD}
            >
              <label className="block text-xs text-gray-600 mb-1">Ou ajouter une URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="admin-variant-manual-image-url"
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.target as HTMLInputElement;
                      if (input.value.trim()) {
                        setVariantFormData((prev) => ({
                          ...prev,
                          images: [...prev.images, input.value.trim()],
                        }));
                        input.value = '';
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      'admin-variant-manual-image-url'
                    ) as HTMLInputElement | null;
                    if (input?.value.trim()) {
                      setVariantFormData((prev) => ({
                        ...prev,
                        images: [...prev.images, input.value.trim()],
                      }));
                      input.value = '';
                    }
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto"
                >
                  Ajouter
                </Button>
              </div>
            </div>

            {/* Liste des images */}
            {variantFormData.images.length > 0 && (
              <div className="mt-4">
                <label className="block text-xs text-gray-600 mb-2">
                  Images ajoutées ({variantFormData.images.length})
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {variantFormData.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Image variante ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const url = variantFormData.images[index];
                          if (url && isImageApiUrl(url)) {
                            const ok = await deleteImageFromImageApi(url);
                            if (ok) toast.success('Image supprimée du serveur');
                          } else if (url && url.includes('supabase.co/storage')) {
                            const ok = await deleteImageFromStorage(url, 'products');
                            if (ok) toast.success('Image supprimée du stockage');
                          }
                          const newImages = variantFormData.images.filter((_, i) => i !== index);
                          setVariantFormData({ ...variantFormData, images: newImages });
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              onClick={() => setIsVariantModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Annuler
            </Button>
            <Button
              onClick={async () => {
                // Vérifier que toutes les options sont sélectionnées
                const missingOptions = variantOptions.filter(
                  opt => !variantFormData.options[opt.id]
                );
                if (missingOptions.length > 0) {
                  toast.error(`Sélectionnez une valeur pour: ${missingOptions.map(o => o.name).join(', ')}`);
                  return;
                }
                if (editingProduct) {
                  await saveVariant(variantFormData, editingProduct.id);
                }
                setIsVariantModalOpen(false);
              }}
              className="bg-secondary hover:bg-secondary/90"
            >
              {editingVariant ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

