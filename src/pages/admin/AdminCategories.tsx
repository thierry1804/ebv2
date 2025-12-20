import { useEffect, useState, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Category } from '../../types';
import { Plus, Edit, Trash2, Save, Eye, EyeOff, ArrowUp, ArrowDown, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Offcanvas } from '../../components/ui/Offcanvas';
import toast from 'react-hot-toast';

interface DatabaseCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    image: '',
    description: '',
    display_order: 0,
    is_active: true,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.warn('Table categories non trouvée:', error);
        setCategories([]);
      } else {
        // Stocker les données complètes pour pouvoir accéder à is_active
        const adaptedCategories = (data || []).map((c: DatabaseCategory) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image || undefined,
          description: c.description || undefined,
          _dbData: c, // Stocker les données complètes
        })) as any;
        setCategories(adaptedCategories);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des catégories:', error);
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      image: '',
      description: '',
      display_order: categories.length,
      is_active: true,
    });
    setImagePreview(null);
    setSlugManuallyEdited(false);
    setIsOffcanvasOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    const dbCategory = (category as any)._dbData as DatabaseCategory;
    const imageUrl = category.image || '';
    setFormData({
      name: category.name,
      slug: category.slug,
      image: imageUrl,
      description: category.description || '',
      display_order: dbCategory?.display_order || categories.findIndex((c) => c.id === category.id),
      is_active: dbCategory?.is_active !== false,
    });
    setImagePreview(imageUrl || null);
    setSlugManuallyEdited(true); // En mode édition, on considère que le slug a été édité
    setIsOffcanvasOpen(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        setIsUploading(false);
        return;
      }

      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `categories/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('categories')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Si le bucket n'existe pas, créer un message d'erreur explicite
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('Le bucket "categories" n\'existe pas. Veuillez le créer dans Supabase Storage.');
        } else {
          throw uploadError;
        }
        setIsUploading(false);
        return;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('categories')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image: publicUrl });
      setImagePreview(publicUrl);
      toast.success('Image uploadée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
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

  const handleRemoveImage = async () => {
    const currentImage = formData.image;
    
    // Si l'image provient de Supabase Storage, la supprimer du bucket
    if (currentImage && currentImage.includes('supabase.co/storage')) {
      const deleted = await deleteImageFromStorage(currentImage, 'categories');
      if (deleted) {
        toast.success('Image supprimée du stockage');
      } else {
        toast.error('Erreur lors de la suppression de l\'image du stockage');
      }
    }

    setFormData({ ...formData, image: '' });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      if (!formData.name.trim()) {
        toast.error('Le nom est requis');
        return;
      }

      const slug = formData.slug.trim() || generateSlug(formData.name);

      const categoryData = {
        name: formData.name.trim(),
        slug: slug,
        image: formData.image.trim() || null,
        description: formData.description.trim() || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
        updated_by: user.id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Catégorie modifiée avec succès');
      } else {
        const { error } = await supabase.from('categories').insert(categoryData);

        if (error) throw error;
        toast.success('Catégorie créée avec succès');
      }

      setIsOffcanvasOpen(false);
      loadCategories();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;

    try {
      // Récupérer la catégorie pour obtenir l'image
      const { data: categoryData, error: fetchError } = await supabase
        .from('categories')
        .select('image')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la récupération de la catégorie:', fetchError);
      }

      // Supprimer l'image du bucket si elle existe
      if (categoryData?.image && categoryData.image.includes('supabase.co/storage')) {
        await deleteImageFromStorage(categoryData.image, 'categories');
      }

      // Supprimer la catégorie de la base de données
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('Catégorie supprimée avec succès');
      loadCategories();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const { data: dbCategory } = await supabase
        .from('categories')
        .select('is_active')
        .eq('id', category.id)
        .single();

      if (!dbCategory) return;

      const { error } = await supabase
        .from('categories')
        .update({ is_active: !dbCategory.is_active })
        .eq('id', category.id);

      if (error) throw error;
      toast.success(`Catégorie ${dbCategory.is_active ? 'désactivée' : 'activée'}`);
      loadCategories();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleMoveOrder = async (category: Category, direction: 'up' | 'down') => {
    try {
      const currentIndex = categories.findIndex((c) => c.id === category.id);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= categories.length) return;

      const otherCategory = categories[newIndex];

      // Échanger les display_order
      const { error: error1 } = await supabase
        .from('categories')
        .update({ display_order: newIndex })
        .eq('id', category.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('categories')
        .update({ display_order: currentIndex })
        .eq('id', otherCategory.id);

      if (error2) throw error2;

      loadCategories();
    } catch (error: any) {
      console.error('Erreur lors du déplacement:', error);
      toast.error('Erreur lors du déplacement');
    }
  };

  // Trier les catégories : actives en premier, puis inactives
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aDb = (a as any)._dbData as DatabaseCategory;
      const bDb = (b as any)._dbData as DatabaseCategory;
      const aActive = aDb?.is_active !== false;
      const bActive = bDb?.is_active !== false;
      
      // Actives en premier
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      
      // Si même statut, conserver l'ordre d'affichage
      return (aDb?.display_order || 0) - (bDb?.display_order || 0);
    });
  }, [categories]);

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Catégories</h1>
        <Button onClick={handleCreate} className="bg-secondary hover:bg-secondary/90">
          <Plus size={20} className="mr-2" />
          Nouvelle catégorie
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune catégorie trouvée. Créez une table "categories" dans Supabase.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCategories.map((category, index) => {
            const dbCategory = (category as any)._dbData as DatabaseCategory;
            const isActive = dbCategory?.is_active !== false;

            return (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full"
              >
                {category.image && (
                  <div className="aspect-video overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2 flex-shrink-0">
                    <div className="flex-1">
                      <h3 className="font-semibold text-text-dark text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        <code className="bg-gray-100 px-2 py-1 rounded">{category.slug}</code>
                      </p>
                      {category.description && (
                        <p className="text-sm text-gray-600 mt-2">{category.description}</p>
                      )}
                    </div>
                    {!isActive && (
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded flex-shrink-0 ml-2">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMoveOrder(category, 'up')}
                        disabled={index === 0}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Déplacer vers le haut"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(category, 'down')}
                        disabled={index === sortedCategories.length - 1}
                        className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Déplacer vers le bas"
                      >
                        <ArrowDown size={16} />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleActive(category)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title={isActive ? 'Désactiver' : 'Activer'}
                      >
                        {isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => setIsOffcanvasOpen(false)}
        title={editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        position="right"
        width="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setIsOffcanvasOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90">
              <Save size={18} className="mr-2" />
              {editingCategory ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const newName = e.target.value;
                setFormData({
                  ...formData,
                  name: newName,
                  // Générer le slug automatiquement seulement si l'utilisateur ne l'a pas modifié manuellement
                  slug: slugManuallyEdited ? formData.slug : generateSlug(newName),
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              placeholder="Vêtements"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                setFormData({ ...formData, slug: e.target.value });
                setSlugManuallyEdited(true); // Marquer comme édité manuellement
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              placeholder="vetements"
            />
            <p className="text-xs text-gray-500 mt-1">
              Identifiant unique pour l'URL (généré automatiquement si vide)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
            
            {/* Upload de fichier */}
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              >
                <Upload size={18} />
                {isUploading ? 'Upload en cours...' : 'Uploader une image'}
              </label>
              {imagePreview && (
                <button
                  onClick={handleRemoveImage}
                  className="ml-2 inline-flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
                >
                  <X size={16} />
                  Supprimer
                </button>
              )}
            </div>

            {/* URL manuelle */}
            <div className="mb-2">
              <label className="block text-xs text-gray-600 mb-1">Ou entrer une URL</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => {
                  setFormData({ ...formData, image: e.target.value });
                  setImagePreview(e.target.value || null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            {/* Prévisualisation */}
            {(imagePreview || formData.image) && (
              <div className="mt-2 relative">
                <img
                  src={imagePreview || formData.image}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              placeholder="Description de la catégorie..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              min="0"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>
      </Offcanvas>
    </div>
  );
}

