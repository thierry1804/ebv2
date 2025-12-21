import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { DatabaseBlogPost } from '../../types';
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Offcanvas } from '../../components/ui/Offcanvas';
import { markdownToHtml } from '../../utils/markdown';
import { convertToWebP } from '../../utils/imageUtils';

export default function AdminArticles() {
  const [articles, setArticles] = useState<DatabaseBlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<DatabaseBlogPost | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    image: '',
    author: '',
    category: '',
    tags: '',
    is_published: false,
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des articles:', error);
      toast.error('Erreur lors du chargement des articles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      image: '',
      author: '',
      category: '',
      tags: '',
      is_published: false,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (article: DatabaseBlogPost) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      image: article.image,
      author: article.author,
      category: article.category,
      tags: article.tags.join(', '),
      is_published: article.is_published,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const tagsArray = formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean);

      if (editingArticle) {
        const { error } = await supabase
          .from('blog_posts')
          .update({
            title: formData.title,
            excerpt: formData.excerpt,
            content: formData.content,
            image: formData.image,
            author: formData.author,
            category: formData.category,
            tags: tagsArray,
            is_published: formData.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingArticle.id);

        if (error) throw error;
        toast.success('Article modifié avec succès');
      } else {
        const { error } = await supabase.from('blog_posts').insert({
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
          image: formData.image,
          author: formData.author,
          category: formData.category,
          tags: tagsArray,
          is_published: formData.is_published,
          published_at: formData.is_published ? new Date().toISOString() : null,
        });

        if (error) throw error;
        toast.success('Article créé avec succès');
      }

      setIsModalOpen(false);
      loadArticles();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const deleteImageFromStorage = async (imageUrl: string, bucket: string): Promise<boolean> => {
    try {
      // Extraire le chemin du fichier depuis l'URL publique Supabase
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

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        setUploadingImage(false);
        return;
      }

      // Convertir l'image en WebP
      const webpFile = await convertToWebP(file);

      // Générer un nom de fichier unique
      const fileExt = webpFile.name.split('.').pop();
      const fileName = `hero/blog/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload vers Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('hero')
        .upload(fileName, webpFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          toast.error('Le bucket "hero" n\'existe pas. Veuillez le créer dans Supabase Storage.');
        } else {
          throw uploadError;
        }
        setUploadingImage(false);
        return;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('hero')
        .getPublicUrl(fileName);

      // Mettre à jour le formulaire avec la nouvelle URL
      setFormData({ ...formData, image: publicUrl });

      toast.success('Image uploadée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Réinitialiser l'input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async () => {
    const currentImage = formData.image;
    
    // Si l'image provient de Supabase Storage, la supprimer du bucket
    if (currentImage && currentImage.includes('supabase.co/storage')) {
      const deleted = await deleteImageFromStorage(currentImage, 'hero');
      if (deleted) {
        toast.success('Image supprimée du stockage');
      } else {
        toast.error('Erreur lors de la suppression de l\'image du stockage');
      }
    }

    setFormData({ ...formData, image: '' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;

    try {
      // Récupérer l'article pour obtenir l'URL de l'image
      const article = articles.find(a => a.id === id);
      
      // Si l'article a une image dans Supabase Storage, la supprimer
      if (article?.image && article.image.includes('supabase.co/storage')) {
        const deleted = await deleteImageFromStorage(article.image, 'hero');
        if (deleted) {
          toast.success('Image supprimée du stockage');
        }
      }

      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Article supprimé avec succès');
      loadArticles();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const togglePublish = async (article: DatabaseBlogPost) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({
          is_published: !article.is_published,
          published_at: !article.is_published ? new Date().toISOString() : article.published_at,
        })
        .eq('id', article.id);

      if (error) throw error;
      toast.success(
        article.is_published ? 'Article dépublié' : 'Article publié'
      );
      loadArticles();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Articles</h1>
        <Button onClick={handleCreate} className="bg-secondary hover:bg-secondary/90">
          <Plus size={20} className="mr-2" />
          Nouvel article
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Titre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Auteur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Catégorie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Aucun article trouvé
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-dark">{article.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {article.excerpt}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{article.category}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        article.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {article.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(article.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => togglePublish(article)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title={article.is_published ? 'Dépublier' : 'Publier'}
                      >
                        {article.is_published ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button
                        onClick={() => handleEdit(article)}
                        className="p-2 text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
        width="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90">
              {editingArticle ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extrait</label>
            <textarea
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu (Markdown)</label>
            <div className="grid grid-cols-2 gap-4">
              {/* Éditeur Markdown */}
              <div>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={20}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary font-mono text-sm"
                  placeholder="Écrivez votre contenu en Markdown ici..."
                />
              </div>
              {/* Prévisualisation */}
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 overflow-y-auto max-h-[500px]">
                <div className="text-xs text-gray-500 mb-2 font-semibold">Aperçu :</div>
                <div
                  className="prose prose-sm max-w-none text-text-dark/80"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(formData.content) }}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://... ou uploader une image"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  ref={imageInputRef}
                  className="hidden"
                  id="article-image-upload"
                />
                <label
                  htmlFor="article-image-upload"
                  className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Upload...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Uploader
                    </>
                  )}
                </label>
              </div>
              {formData.image && (
                <div className="relative">
                  <img
                    src={formData.image}
                    alt="Aperçu"
                    className="w-full max-w-md h-auto rounded-lg border border-gray-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                    title="Supprimer l'image"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auteur</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (séparés par des virgules)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_published" className="text-sm text-gray-700">
              Publier immédiatement
            </label>
          </div>
        </div>
      </Offcanvas>
    </div>
  );
}

