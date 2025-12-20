import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LandingPageConfig, HeroSliderConfig, HeaderLogoConfig, PromotionalBannerConfig, SectionConfig, InstagramConfig, NewsletterConfig } from '../../types';
import { Save, Edit, Eye, EyeOff, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

export default function AdminLandingPage() {
  const [configs, setConfigs] = useState<LandingPageConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);

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
                    <input
                      type="text"
                      placeholder="URL de l'image"
                      value={slide.image || ''}
                      onChange={(e) => {
                        const newSlides = [...(data.slides || [])];
                        newSlides[index] = { ...slide, image: e.target.value };
                        setFormData({ ...data, slides: newSlides });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
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

