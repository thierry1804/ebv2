import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { Plus, Edit, Trash2, Upload, X, Check, Package, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Offcanvas } from '../../components/ui/Offcanvas';
import { Modal } from '../../components/ui/Modal';
import { useCategories } from '../../hooks/useCategories';
import { predefinedColors as sharedPredefinedColors } from '../../config/colors';
import { getColorNameFromHex } from '../../config/colorNames';
import { convertToWebP } from '../../utils/imageUtils';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useProductVariants } from '../../hooks/useProductVariants';
import { 
  VariantOption, 
  ProductVariant, 
  VariantOptionFormData,
  VariantFormData,
  getVariantDisplayName 
} from '../../types/variants';

export default function AdminProducts() {
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
  const [selectedColors, setSelectedColors] = useState<Array<{name: string, hex: string, custom: boolean}>>([]);
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#1abc9c');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHexInput, setCustomColorHexInput] = useState('#1abc9c');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Hook pour les variantes
  const { 
    variants, 
    options: variantOptions, 
    isLoading: isLoadingVariants,
    loadVariants,
    saveOption,
    deleteOption,
    saveVariant,
    deleteVariant,
    generateAllVariants,
    getTotalStock,
    getPriceRange
  } = useProductVariants(editingProduct?.id || null);

  // Palette de couleurs prédéfinies (importée depuis la config partagée)
  const predefinedColors = sharedPredefinedColors;

  // Fonction pour calculer si une couleur est sombre
  const isColorDark = (hex: string): boolean => {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  };

  useEffect(() => {
    // Charger les produits une seule fois au montage
    loadProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Table products non trouvée:', error);
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
              // Si le premier élément est un objet avec name et hex, c'est le nouveau format
              const firstColor = parsedColors[0];
              if (firstColor && typeof firstColor === 'object' && firstColor !== null && 
                  'name' in firstColor && 'hex' in firstColor) {
                // Nouveau format : ColorWithHex[]
                colors = parsedColors.map((c: any) => ({
                  name: c.name || 'Couleur inconnue',
                  hex: (c.hex && /^#[0-9A-F]{6}$/i.test(c.hex)) ? c.hex.toUpperCase() : '#CCCCCC'
                }));
              } else if (typeof firstColor === 'string') {
                // Ancien format : tableau de strings, on le garde tel quel pour compatibilité
                colors = parsedColors;
              }
            }
          }
          
          return {
            id: p.id,
            name: p.name,
            category: p.category,
            price: p.price,
            images: Array.isArray(p.images) ? p.images : [p.image || ''],
            sizes: Array.isArray(p.sizes) ? p.sizes : [],
            colors: colors,
            description: p.description || '',
            composition: p.composition || '',
            stock: p.stock || 0,
            rating: p.rating || 0,
            reviewCount: p.review_count || 0,
            isNew: p.is_new || false,
            isOnSale: p.is_on_sale || false,
            salePrice: p.sale_price,
            brand: p.brand,
            hasVariants: p.has_variants || false,
          };
        });
        setProducts(adaptedProducts);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des produits:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
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
    
    const isDark = isColorDark(hex);
    const newColor = { name: colorName, hex, custom: true };
    const updatedColors = [...selectedColors, newColor];
    setSelectedColors(updatedColors);
    setFormData({ ...formData, colors: updatedColors.map(c => c.name).join(', ') });
    setCustomColorName('');
    setSelectedColorHex('#1abc9c');
    setCustomColorHexInput('#1abc9c');
    toast.success(`Couleur "${colorName}" ajoutée avec succès !`);
  };

  const removeColor = (colorToRemove: { name: string; hex: string; custom: boolean }) => {
    const updatedColors = selectedColors.filter((c) => !(c.name === colorToRemove.name && c.hex === colorToRemove.hex));
    setSelectedColors(updatedColors);
    setFormData({ ...formData, colors: updatedColors.map(c => c.name).join(', ') });
  };

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

      // Convertir l'image en WebP
      const webpFile = await convertToWebP(file);

      // Générer un nom de fichier unique avec timestamp et random pour éviter les collisions
      const fileExt = webpFile.name.split('.').pop();
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `products/${timestamp}-${random}.${fileExt}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, webpFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('Le bucket "products" n\'existe pas. Veuillez le créer dans Supabase Storage.');
        } else {
          throw uploadError;
        }
        return null;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload de l\'image');
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

  const handleRemoveImage = async (index: number) => {
    const imageToRemove = formData.images[index];
    
    // Si l'image provient de Supabase Storage, la supprimer du bucket
    if (imageToRemove && imageToRemove.includes('supabase.co/storage')) {
      const deleted = await deleteImageFromStorage(imageToRemove, 'products');
      if (deleted) {
        toast.success('Image supprimée du stockage');
      } else {
        toast.error('Erreur lors de la suppression de l\'image du stockage');
      }
    }

    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleSave = async () => {
    try {
      const sizesArray = formData.sizes.split(',').map((s) => s.trim()).filter(Boolean);
      // Stocker les couleurs avec leur code hexadécimal
      const colorsArray = selectedColors.length > 0 
        ? selectedColors.map(c => ({ name: c.name, hex: c.hex }))
        : formData.colors.split(',').map((c) => {
            const colorName = c.trim();
            const predefined = predefinedColors.find(pc => pc.name === colorName);
            return {
              name: colorName,
              hex: predefined ? predefined.hex : '#CCCCCC'
            };
          }).filter(c => c.name);
      const imagesArray = formData.images;

      const productData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        composition: formData.composition,
        stock: formData.hasVariants ? 0 : parseInt(formData.stock), // Stock géré par variantes si activé
        sizes: sizesArray,
        colors: colorsArray, // Maintenant stocké avec hex
        images: imagesArray,
        is_new: formData.isNew,
        is_on_sale: formData.isOnSale,
        sale_price: formData.salePrice ? parseFloat(formData.salePrice) : null,
        brand: formData.brand || null,
        has_variants: formData.hasVariants,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produit modifié avec succès');
      } else {
        const { error } = await supabase.from('products').insert(productData);

        if (error) throw error;
        toast.success('Produit créé avec succès');
      }

      setIsOffcanvasOpen(false);
      loadProducts();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

    try {
      // Récupérer le produit pour obtenir les images
      const { data: productData, error: fetchError } = await supabase
        .from('products')
        .select('images, image')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la récupération du produit:', fetchError);
      }

      // Supprimer toutes les images du bucket
      if (productData) {
        const imagesToDelete: string[] = [];
        
        // Ajouter les images du tableau images
        if (Array.isArray(productData.images)) {
          imagesToDelete.push(...productData.images);
        }
        
        // Ajouter l'image unique si elle existe
        if (productData.image && !imagesToDelete.includes(productData.image)) {
          imagesToDelete.push(productData.image);
        }

        // Supprimer chaque image du bucket
        for (const imageUrl of imagesToDelete) {
          if (imageUrl && imageUrl.includes('supabase.co/storage')) {
            await deleteImageFromStorage(imageUrl, 'products');
          }
        }
      }

      // Supprimer le produit de la base de données
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Produit supprimé avec succès');
      loadProducts();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Produits</h1>
        <Button onClick={handleCreate} className="bg-secondary hover:bg-secondary/90">
          <Plus size={20} className="mr-2" />
          Nouveau produit
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Aucun produit trouvé. Créez une table "products" dans Supabase.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-dark">{product.name}</div>
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
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => setIsOffcanvasOpen(false)}
        title={editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
        position="right"
        width="xl"
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              onClick={() => setIsOffcanvasOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90 w-full sm:w-auto">
              {editingProduct ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                required
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prix (MGA)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
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
                    selectedColors.map((selectedColor, index) => {
                      // Debug
                      if (index === 0) {
                        console.log('selectedColors:', selectedColors);
                        console.log('Première couleur:', selectedColor);
                      }
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
                onClose={() => setIsColorModalOpen(false)}
                title="Ajouter des couleurs"
                size="md"
                showBackdrop={false}
                draggable={true}
              >
                <div className="space-y-6">
                  {/* Couleurs non sélectionnées */}
                  <div>
                    <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wide">Couleurs disponibles</p>
                    <div className="flex flex-wrap gap-1.5">
                      {predefinedColors
                        .filter(color => !selectedColors.some(c => c.name === color.name && !c.custom))
                        .map((color) => {
                          return (
                            <button
                              key={color.name}
                              type="button"
                              onClick={() => {
                                setCustomColorName(color.name);
                                setSelectedColorHex(color.hex);
                                setCustomColorHexInput(color.hex);
                              }}
                              className="relative w-8 h-8 rounded-full border-2 border-transparent hover:scale-110 hover:shadow-lg transition-all duration-300"
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            />
                          );
                        })}
                    </div>
                  </div>

                  {/* Ajout de couleur personnalisée */}
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-600 mb-3 font-semibold uppercase tracking-wide">Ajouter une couleur personnalisée</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1.5">Nom de la couleur</label>
                        <input
                          type="text"
                          value={customColorName}
                          onChange={(e) => setCustomColorName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomColor();
                              setIsColorModalOpen(false);
                            }
                          }}
                          placeholder="Ex: Turquoise, Corail, Menthe..."
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary text-sm"
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
                              // Toujours mettre à jour le nom de la couleur quand la couleur change
                              setCustomColorName(getColorNameFromHex(newHex));
                            }}
                            className="w-14 h-11 border-2 border-gray-300 rounded-lg cursor-pointer"
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
                                // Toujours mettre à jour le nom de la couleur quand le code hex change
                                setCustomColorName(getColorNameFromHex(hex));
                              }
                            }}
                            placeholder="#000000"
                            className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-secondary text-sm font-mono"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          addCustomColor();
                          setIsColorModalOpen(false);
                        }}
                        disabled={!customColorName.trim()}
                        className="w-full px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <Plus size={18} />
                        Ajouter cette couleur
                      </button>
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              >
                <Upload size={18} />
                {isUploading ? 'Upload en cours...' : 'Uploader des images'}
              </label>
            </div>

            {/* URLs manuelles */}
            <div className="mb-2">
              <label className="block text-xs text-gray-600 mb-1">Ou ajouter une URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
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
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="https://images"]') as HTMLInputElement;
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
                onChange={(e) => setFormData({ ...formData, isOnSale: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="isOnSale" className="text-sm text-gray-700">
                En promotion
              </label>
            </div>
          </div>
          {formData.isOnSale && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix promotionnel (MGA)
              </label>
              <input
                type="number"
                value={formData.salePrice}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
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

            {formData.hasVariants && isVariantsSectionOpen && editingProduct && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                {/* Options de variantes */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">Options (ex: Taille, Couleur)</h4>
                    <Button
                      onClick={() => {
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
                                if (confirm('Supprimer cette option ?')) {
                                  await deleteOption(option.id);
                                }
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
                </div>

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
                                        if (confirm('Supprimer cette variante ?')) {
                                          await deleteVariant(variant.id);
                                        }
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

                {formData.hasVariants && !editingProduct && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    ⚠️ Enregistrez d'abord le produit pour pouvoir ajouter des variantes.
                  </p>
                )}
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
                if (!optionFormData.name.trim()) {
                  toast.error('Le nom de l\'option est requis');
                  return;
                }
                const validValues = optionFormData.values.filter(v => v.value.trim());
                if (validValues.length === 0) {
                  toast.error('Ajoutez au moins une valeur');
                  return;
                }
                await saveOption({
                  ...optionFormData,
                  values: validValues
                });
                setIsOptionModalOpen(false);
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
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              >
                <Upload size={18} />
                {isUploadingVariantImages ? 'Upload en cours...' : 'Uploader des images'}
              </label>
            </div>

            {/* URLs manuelles */}
            <div className="mb-2">
              <label className="block text-xs text-gray-600 mb-1">Ou ajouter une URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
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
                  onClick={() => {
                    const input = document.querySelector('input[placeholder*="https://images"]') as HTMLInputElement;
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
                        onClick={() => {
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

