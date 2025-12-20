import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SiteContent } from '../../types';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';

export default function AdminContent() {
  const [contents, setContents] = useState<SiteContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<SiteContent | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    title: '',
    content: '',
    type: 'text' as 'text' | 'html' | 'json',
  });

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    try {
      const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .order('key', { ascending: true });

      if (error) {
        console.warn('Table site_content non trouvée:', error);
        setContents([]);
      } else {
        setContents(data || []);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement du contenu:', error);
      toast.error('Erreur lors du chargement du contenu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContent(null);
    setFormData({
      key: '',
      title: '',
      content: '',
      type: 'text',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (content: SiteContent) => {
    setEditingContent(content);
    setFormData({
      key: content.key,
      title: content.title,
      content: content.content,
      type: content.type,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const contentData = {
        key: formData.key,
        title: formData.title,
        content: formData.content,
        type: formData.type,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (editingContent) {
        const { error } = await supabase
          .from('site_content')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
        toast.success('Contenu modifié avec succès');
      } else {
        const { error } = await supabase.from('site_content').insert(contentData);

        if (error) throw error;
        toast.success('Contenu créé avec succès');
      }

      setIsModalOpen(false);
      loadContents();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) return;

    try {
      const { error } = await supabase.from('site_content').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contenu supprimé avec succès');
      loadContents();
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
        <h1 className="text-3xl font-heading font-bold text-text-dark">Contenu du site</h1>
        <Button onClick={handleCreate} className="bg-secondary hover:bg-secondary/90">
          <Plus size={20} className="mr-2" />
          Nouveau contenu
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contents.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Aucun contenu trouvé. Créez une table "site_content" dans Supabase.
          </div>
        ) : (
          contents.map((content) => (
            <div
              key={content.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-text-dark">{content.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded">{content.key}</code>
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    content.type === 'html'
                      ? 'bg-blue-100 text-blue-800'
                      : content.type === 'json'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {content.type}
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {content.content.substring(0, 100)}
                  {content.content.length > 100 ? '...' : ''}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Modifié le {new Date(content.updatedAt).toLocaleDateString('fr-FR')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(content)}
                    className="p-2 text-blue-600 hover:text-blue-900"
                    title="Modifier"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(content.id)}
                    className="p-2 text-red-600 hover:text-red-900"
                    title="Supprimer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingContent ? 'Modifier le contenu' : 'Nouveau contenu'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Clé (unique)</label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              disabled={!!editingContent}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary disabled:bg-gray-100"
              placeholder="home.hero.title"
            />
            <p className="text-xs text-gray-500 mt-1">
              Identifiant unique pour référencer ce contenu dans le code
            </p>
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'text' | 'html' | 'json' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            >
              <option value="text">Texte</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary font-mono text-sm"
              placeholder={
                formData.type === 'html'
                  ? '<p>Contenu HTML...</p>'
                  : formData.type === 'json'
                  ? '{"key": "value"}'
                  : 'Contenu texte...'
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90">
              <Save size={18} className="mr-2" />
              {editingContent ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

