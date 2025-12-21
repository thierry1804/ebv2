import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import { Plus, Edit, Trash2, Upload, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Offcanvas } from '../../components/ui/Offcanvas';
import { Modal } from '../../components/ui/Modal';
import { useCategories } from '../../hooks/useCategories';
import { predefinedColors as sharedPredefinedColors } from '../../config/colors';
import { convertToWebP } from '../../utils/imageUtils';

export default function AdminProducts() {
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
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedColors, setSelectedColors] = useState<Array<{name: string, hex: string, custom: boolean}>>([]);
  const [selectedColorHex, setSelectedColorHex] = useState<string>('#1abc9c');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHexInput, setCustomColorHexInput] = useState('#1abc9c');
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    loadProducts();
  }, []);

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
        const adaptedProducts = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          images: Array.isArray(p.images) ? p.images : [p.image || ''],
          sizes: Array.isArray(p.sizes) ? p.sizes : [],
          colors: Array.isArray(p.colors) ? p.colors : [],
          description: p.description || '',
          composition: p.composition || '',
          stock: p.stock || 0,
          rating: p.rating || 0,
          reviewCount: p.review_count || 0,
          isNew: p.is_new || false,
          isOnSale: p.is_on_sale || false,
          salePrice: p.sale_price,
          brand: p.brand,
        }));
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
    });
    setSelectedColors([]);
    setSelectedColorHex('#1abc9c');
    setCustomColorHexInput('#1abc9c');
    setCustomColorName('');
    setIsOffcanvasOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const colors = Array.isArray(product.colors) ? product.colors : [];
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description,
      composition: product.composition,
      stock: product.stock.toString(),
      sizes: product.sizes.join(', '),
      colors: colors.join(', '),
      images: product.images || [],
      isNew: product.isNew || false,
      isOnSale: product.isOnSale || false,
      salePrice: product.salePrice?.toString() || '',
      brand: product.brand || '',
    });
    // Convertir les couleurs string en objets
    const colorObjects = colors.map((colorName: string) => {
      const predefined = predefinedColors.find(c => c.name === colorName);
      if (predefined) {
        return { name: predefined.name, hex: predefined.hex, custom: false };
      }
      // Si c'est une couleur personnalisée stockée, on ne peut pas récupérer le hex
      // On utilise un gris par défaut
      return { name: colorName, hex: '#CCCCCC', custom: true };
    });
    setSelectedColors(colorObjects);
    setSelectedColorHex('#1abc9c');
    setCustomColorHexInput('#1abc9c');
    setCustomColorName('');
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
      const colorsArray = selectedColors.length > 0 
        ? selectedColors.map(c => c.name)
        : formData.colors.split(',').map((c) => c.trim()).filter(Boolean);
      const imagesArray = formData.images;

      const productData = {
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        description: formData.description,
        composition: formData.composition,
        stock: parseInt(formData.stock),
        sizes: sizesArray,
        colors: colorsArray,
        images: imagesArray,
        is_new: formData.isNew,
        is_on_sale: formData.isOnSale,
        sale_price: formData.salePrice ? parseFloat(formData.salePrice) : null,
        brand: formData.brand || null,
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
                  {/* Couleurs sélectionnées */}
                  {predefinedColors
                    .filter(color => selectedColors.some(c => c.name === color.name && !c.custom))
                    .map((color) => {
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => toggleColor(color)}
                          className="relative w-8 h-8 rounded-full transition-all duration-300"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          <Check 
                            size={12} 
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" 
                          />
                        </button>
                      );
                    })}
                  
                  {/* Couleurs personnalisées sélectionnées */}
                  {selectedColors
                    .filter(c => c.custom)
                    .map((color, index) => {
                      return (
                        <div
                          key={`custom-${index}`}
                          className="relative group"
                        >
                          <button
                            type="button"
                            className="relative w-8 h-8 rounded-full transition-all duration-300"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            <Check 
                              size={12} 
                              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" 
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeColor(color)}
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold hover:bg-red-600 z-10"
                            title="Supprimer cette couleur"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  
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
                                toggleColor(color);
                                setIsColorModalOpen(false);
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
                              setSelectedColorHex(e.target.value);
                              setCustomColorHexInput(e.target.value);
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
        </div>
      </Offcanvas>
    </div>
  );
}

