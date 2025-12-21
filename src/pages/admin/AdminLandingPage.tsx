import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { LandingPageConfig, HeroSliderConfig, HeaderLogoConfig, PromotionalBannerConfig, SectionConfig, InstagramConfig, NewsletterConfig, FeaturedContentConfig, SocialMediaConfig } from '../../types';
import { Save, Edit, Eye, EyeOff, Plus, Trash2, Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { convertToWebP } from '../../utils/imageUtils';

export default function AdminLandingPage() {
  const [configs, setConfigs] = useState<LandingPageConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);
  const [uploadingSlides, setUploadingSlides] = useState<Set<number>>(new Set());
  const [uploadingFeaturedImage, setUploadingFeaturedImage] = useState(false);
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const featuredImageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('landing_page_config')
        .select('*')
        .order('section_key', { ascending: true });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement:', error);
      toast.error('Erreur lors du chargement des configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (config: LandingPageConfig) => {
    setEditingKey(config.section_key);
    setFormData(config.config_data);
  };

  const handleSave = async (sectionKey: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const { error } = await supabase
        .from('landing_page_config')
        .update({
          config_data: formData,
          updated_by: user.id,
        })
        .eq('section_key', sectionKey);

      if (error) throw error;
      toast.success('Configuration sauvegardée avec succès');
      setEditingKey(null);
      loadConfigs();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleToggleActive = async (config: LandingPageConfig) => {
    try {
      const { error } = await supabase
        .from('landing_page_config')
        .update({ is_active: !config.is_active })
        .eq('section_key', config.section_key);

      if (error) throw error;
      toast.success(`Section ${config.is_active ? 'désactivée' : 'activée'}`);
      loadConfigs();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleHeroImageUpload = async (file: File, slideIndex: number) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingSlides((prev) => new Set(prev).add(slideIndex));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        setUploadingSlides((prev) => {
          const newSet = new Set(prev);
          newSet.delete(slideIndex);
          return newSet;
        });
        return;
      }

      // Convertir l'image en WebP
      const webpFile = await convertToWebP(file);

      // Générer un nom de fichier unique
      const fileExt = webpFile.name.split('.').pop();
      const fileName = `hero/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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
        setUploadingSlides((prev) => {
          const newSet = new Set(prev);
          newSet.delete(slideIndex);
          return newSet;
        });
        return;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('hero')
        .getPublicUrl(fileName);

      // Mettre à jour le slide avec la nouvelle URL
      const data = formData as HeroSliderConfig;
      const newSlides = [...(data.slides || [])];
      newSlides[slideIndex] = { ...newSlides[slideIndex], image: publicUrl };
      setFormData({ ...data, slides: newSlides });

      toast.success('Image uploadée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingSlides((prev) => {
        const newSet = new Set(prev);
        newSet.delete(slideIndex);
        return newSet;
      });
    }
  };

  const handleHeroFileSelect = (e: React.ChangeEvent<HTMLInputElement>, slideIndex: number) => {
    const file = e.target.files?.[0];
    if (file) {
      handleHeroImageUpload(file, slideIndex);
    }
    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    if (fileInputRefs.current[slideIndex]) {
      fileInputRefs.current[slideIndex]!.value = '';
    }
  };

  const handleFeaturedContentImageUpload = async (file: File) => {
    try {
      setUploadingFeaturedImage(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        setUploadingFeaturedImage(false);
        return;
      }

      // Convertir l'image en WebP
      const webpFile = await convertToWebP(file);

      // Générer un nom de fichier unique
      const fileExt = webpFile.name.split('.').pop();
      const fileName = `hero/featured/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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
        setUploadingFeaturedImage(false);
        return;
      }

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('hero')
        .getPublicUrl(fileName);

      // Mettre à jour le formulaire avec la nouvelle URL
      const data = formData as FeaturedContentConfig;
      setFormData({ ...data, image: publicUrl });

      toast.success('Image uploadée avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingFeaturedImage(false);
    }
  };

  const handleFeaturedContentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFeaturedContentImageUpload(file);
    }
    // Réinitialiser l'input pour permettre de sélectionner le même fichier à nouveau
    if (featuredImageInputRef.current) {
      featuredImageInputRef.current.value = '';
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

  const handleRemoveFeaturedImage = async () => {
    const data = formData as FeaturedContentConfig;
    const currentImage = data.image;
    
    // Si l'image provient de Supabase Storage, la supprimer du bucket
    if (currentImage && currentImage.includes('supabase.co/storage')) {
      const deleted = await deleteImageFromStorage(currentImage, 'hero');
      if (deleted) {
        toast.success('Image supprimée du stockage');
      } else {
        toast.error('Erreur lors de la suppression de l\'image du stockage');
      }
    }

    setFormData({ ...data, image: '' });
  };

  const renderEditor = (config: LandingPageConfig) => {
    const key = config.section_key;

    if (key === 'header.logo') {
      const data = formData as HeaderLogoConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte du logo</label>
            <input
              type="text"
              value={data.text || ''}
              onChange={(e) => setFormData({ ...data, text: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL de l'image (optionnel)</label>
            <input
              type="text"
              value={data.imageUrl || ''}
              onChange={(e) => setFormData({ ...data, imageUrl: e.target.value || null })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lien</label>
            <input
              type="text"
              value={data.link || ''}
              onChange={(e) => setFormData({ ...data, link: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      );
    }

    if (key === 'header.promotional_banner') {
      const data = formData as PromotionalBannerConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte</label>
            <input
              type="text"
              value={data.text || ''}
              onChange={(e) => setFormData({ ...data, text: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.isVisible !== false}
                onChange={(e) => setFormData({ ...data, isVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
          </div>
        </div>
      );
    }

    if (key === 'hero.slider') {
      const data = formData as HeroSliderConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={data.autoplay !== false}
                onChange={(e) => setFormData({ ...data, autoplay: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Lecture automatique</span>
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intervalle (ms)</label>
            <input
              type="number"
              value={data.autoplayInterval || 5000}
              onChange={(e) => setFormData({ ...data, autoplayInterval: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slides</label>
            <div className="space-y-4">
              {(data.slides || []).map((slide: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Slide {index + 1}</span>
                    <button
                      onClick={() => {
                        const newSlides = [...(data.slides || [])];
                        newSlides.splice(index, 1);
                        setFormData({ ...data, slides: newSlides });
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Titre"
                      value={slide.title || ''}
                      onChange={(e) => {
                        const newSlides = [...(data.slides || [])];
                        newSlides[index] = { ...slide, title: e.target.value };
                        setFormData({ ...data, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Sous-titre"
                      value={slide.subtitle || ''}
                      onChange={(e) => {
                        const newSlides = [...(data.slides || [])];
                        newSlides[index] = { ...slide, subtitle: e.target.value };
                        setFormData({ ...data, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Image du slide</label>
                      {slide.image ? (
                        <div className="relative">
                          <img
                            src={slide.image}
                            alt={`Prévisualisation slide ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => {
                              const newSlides = [...(data.slides || [])];
                              newSlides[index] = { ...slide, image: '' };
                              setFormData({ ...data, slides: newSlides });
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="Supprimer l'image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                          <input
                            ref={(el) => {
                              fileInputRefs.current[index] = el;
                            }}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleHeroFileSelect(e, index)}
                            className="hidden"
                            id={`hero-image-${index}`}
                          />
                          <label
                            htmlFor={`hero-image-${index}`}
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            <Upload
                              size={24}
                              className={`mb-2 text-gray-400 ${uploadingSlides.has(index) ? 'animate-pulse' : ''}`}
                            />
                            <span className="text-sm text-gray-600">
                              {uploadingSlides.has(index) ? 'Upload en cours...' : 'Cliquez pour uploader une image'}
                            </span>
                          </label>
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Ou entrez une URL d'image"
                        value={slide.image || ''}
                        onChange={(e) => {
                          const newSlides = [...(data.slides || [])];
                          newSlides[index] = { ...slide, image: e.target.value };
                          setFormData({ ...data, slides: newSlides });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Lien"
                      value={slide.link || ''}
                      onChange={(e) => {
                        const newSlides = [...(data.slides || [])];
                        newSlides[index] = { ...slide, link: e.target.value };
                        setFormData({ ...data, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Texte du bouton"
                      value={slide.buttonText || ''}
                      onChange={(e) => {
                        const newSlides = [...(data.slides || [])];
                        newSlides[index] = { ...slide, buttonText: e.target.value };
                        setFormData({ ...data, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={slide.isActive !== false}
                        onChange={(e) => {
                          const newSlides = [...(data.slides || [])];
                          newSlides[index] = { ...slide, isActive: e.target.checked };
                          setFormData({ ...data, slides: newSlides });
                        }}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-600">Actif</span>
                    </label>
                  </div>
                </div>
              ))}
              <Button
                onClick={() => {
                  setFormData({
                    ...data,
                    slides: [
                      ...(data.slides || []),
                      {
                        title: '',
                        subtitle: '',
                        image: '',
                        link: '/boutique',
                        buttonText: 'Découvrir',
                        isActive: true,
                      },
                    ],
                  });
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                <Plus size={16} className="mr-2" />
                Ajouter un slide
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (['categories', 'new_arrivals', 'best_sellers', 'sales'].includes(key)) {
      const data = formData as SectionConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setFormData({ ...data, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          {data.seeAllLink !== undefined && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lien "Voir tout"</label>
                <input
                  type="text"
                  value={data.seeAllLink || ''}
                  onChange={(e) => setFormData({ ...data, seeAllLink: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texte "Voir tout"</label>
                <input
                  type="text"
                  value={data.seeAllText || ''}
                  onChange={(e) => setFormData({ ...data, seeAllText: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.isVisible !== false}
                onChange={(e) => setFormData({ ...data, isVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
          </div>
        </div>
      );
    }

    if (key === 'instagram') {
      const data = formData as InstagramConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setFormData({ ...data, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={data.isVisible !== false}
                onChange={(e) => setFormData({ ...data, isVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
            <label className="block text-sm font-medium text-gray-700 mb-2">Posts Instagram</label>
            <div className="space-y-2">
              {(data.posts || []).map((post: any, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="URL de l'image"
                    value={post.image || ''}
                    onChange={(e) => {
                      const newPosts = [...(data.posts || [])];
                      newPosts[index] = { ...post, image: e.target.value };
                      setFormData({ ...data, posts: newPosts });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Lien"
                    value={post.link || ''}
                    onChange={(e) => {
                      const newPosts = [...(data.posts || [])];
                      newPosts[index] = { ...post, link: e.target.value };
                      setFormData({ ...data, posts: newPosts });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => {
                      const newPosts = [...(data.posts || [])];
                      newPosts.splice(index, 1);
                      setFormData({ ...data, posts: newPosts });
                    }}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <Button
                onClick={() => {
                  setFormData({
                    ...data,
                    posts: [...(data.posts || []), { image: '', link: '#' }],
                  });
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                <Plus size={16} className="mr-2" />
                Ajouter un post
              </Button>
            </div>
          </div>
        </div>
      );
    }

    if (key === 'newsletter') {
      const data = formData as NewsletterConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setFormData({ ...data, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => setFormData({ ...data, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
            <input
              type="text"
              value={data.placeholder || ''}
              onChange={(e) => setFormData({ ...data, placeholder: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte du bouton</label>
            <input
              type="text"
              value={data.buttonText || ''}
              onChange={(e) => setFormData({ ...data, buttonText: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.isVisible !== false}
                onChange={(e) => setFormData({ ...data, isVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
          </div>
        </div>
      );
    }

    if (key === 'featured_content') {
      const data = formData as FeaturedContentConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input
              type="text"
              value={data.title || ''}
              onChange={(e) => setFormData({ ...data, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => setFormData({ ...data, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={data.image || ''}
                  onChange={(e) => setFormData({ ...data, image: e.target.value })}
                  placeholder="https://... ou uploader une image"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFeaturedContentFileSelect}
                  ref={featuredImageInputRef}
                  className="hidden"
                  id="featured-content-image-upload"
                />
                <label
                  htmlFor="featured-content-image-upload"
                  className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploadingFeaturedImage ? (
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
              {data.image && (
                <div className="relative">
                  <img
                    src={data.image}
                    alt="Aperçu"
                    className="w-full max-w-md h-auto rounded-lg border border-gray-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={handleRemoveFeaturedImage}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
                    title="Supprimer l'image"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Texte du bouton (optionnel)</label>
            <input
              type="text"
              value={data.buttonText || ''}
              onChange={(e) => setFormData({ ...data, buttonText: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lien du bouton (optionnel)</label>
            <input
              type="text"
              value={data.buttonLink || ''}
              onChange={(e) => setFormData({ ...data, buttonLink: e.target.value })}
              placeholder="/boutique"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.isVisible !== false}
                onChange={(e) => setFormData({ ...data, isVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
          </div>
        </div>
      );
    }

    if (key === 'social_media') {
      const data = formData as SocialMediaConfig;
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la marque</label>
            <input
              type="text"
              value={data.brandName || ''}
              onChange={(e) => setFormData({ ...data, brandName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={data.description || ''}
              onChange={(e) => setFormData({ ...data, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Facebook (optionnel)</label>
            <input
              type="url"
              value={data.facebookUrl || ''}
              onChange={(e) => setFormData({ ...data, facebookUrl: e.target.value })}
              placeholder="https://facebook.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Instagram (optionnel)</label>
            <input
              type="url"
              value={data.instagramUrl || ''}
              onChange={(e) => setFormData({ ...data, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Twitter (optionnel)</label>
            <input
              type="url"
              value={data.twitterUrl || ''}
              onChange={(e) => setFormData({ ...data, twitterUrl: e.target.value })}
              placeholder="https://twitter.com/..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL TikTok (optionnel)</label>
            <input
              type="url"
              value={data.tiktokUrl || ''}
              onChange={(e) => setFormData({ ...data, tiktokUrl: e.target.value })}
              placeholder="https://tiktok.com/@..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.isVisible !== false}
                onChange={(e) => setFormData({ ...data, isVisible: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Visible</span>
            </label>
          </div>
        </div>
      );
    }

    return (
      <div>
        <p className="text-gray-500">Éditeur non disponible pour cette section</p>
        <pre className="mt-4 p-4 bg-gray-100 rounded-lg text-xs overflow-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Configuration de la Landing Page</h1>
      </div>

      <div className="space-y-4">
        {configs.map((config) => (
          <div
            key={config.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-text-dark">{config.section_name}</h3>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {config.section_key}
                </span>
                {!config.is_active && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Désactivé</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(config)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title={config.is_active ? 'Désactiver' : 'Activer'}
                >
                  {config.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button
                  onClick={() => handleEdit(config)}
                  className="p-2 text-blue-600 hover:text-blue-900"
                  title="Modifier"
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>

            {editingKey === config.section_key && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {renderEditor(config)}
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    onClick={() => setEditingKey(null)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => handleSave(config.section_key)}
                    className="bg-secondary hover:bg-secondary/90"
                  >
                    <Save size={18} className="mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

