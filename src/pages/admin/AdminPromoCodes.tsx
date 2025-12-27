import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { PromoCode, DatabasePromoCode } from '../../types';
import { Plus, Edit, Trash2, Save, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Offcanvas } from '../../components/ui/Offcanvas';
import toast from 'react-hot-toast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { formatPrice } from '../../utils/formatters';

export default function AdminPromoCodes() {
  const { adminUser } = useAdminAuth();
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    applicationScope: 'total' as 'item' | 'total',
    validFrom: '',
    validUntil: '',
    usageLimitPerUser: '1',
    minOrderAmount: '',
    isActive: true,
    description: '',
  });
  const [usageStats, setUsageStats] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadPromoCodes();
  }, []);

  useEffect(() => {
    if (promoCodes.length > 0) {
      loadUsageStats();
    }
  }, [promoCodes]);

  const loadPromoCodes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Table promo_codes non trouvée:', error);
        setPromoCodes([]);
      } else {
        const adaptedPromoCodes = (data || []).map((p: DatabasePromoCode) => ({
          id: p.id,
          code: p.code,
          type: p.type,
          value: parseFloat(p.value.toString()),
          applicationScope: p.application_scope || 'total',
          validFrom: p.valid_from || undefined,
          validUntil: p.valid_until || undefined,
          usageLimitPerUser: p.usage_limit_per_user,
          minOrderAmount: p.min_order_amount ? parseFloat(p.min_order_amount.toString()) : undefined,
          isActive: p.is_active,
          description: p.description || undefined,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        }));
        setPromoCodes(adaptedPromoCodes);
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des codes promo:', error);
      toast.error('Erreur lors du chargement des codes promo');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats: { [key: string]: number } = {};
      for (const promoCode of promoCodes) {
        const { count } = await supabase
          .from('promo_code_usage')
          .select('*', { count: 'exact', head: true })
          .eq('promo_code_id', promoCode.id);
        stats[promoCode.id] = count || 0;
      }
      setUsageStats(stats);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleCreate = () => {
    setEditingPromoCode(null);
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      applicationScope: 'total',
      validFrom: '',
      validUntil: '',
      usageLimitPerUser: '1',
      minOrderAmount: '',
      isActive: true,
      description: '',
    });
    setIsOffcanvasOpen(true);
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    setFormData({
      code: promoCode.code,
      type: promoCode.type,
      value: promoCode.value.toString(),
      applicationScope: promoCode.applicationScope || 'total',
      validFrom: promoCode.validFrom ? promoCode.validFrom.split('T')[0] : '',
      validUntil: promoCode.validUntil ? promoCode.validUntil.split('T')[0] : '',
      usageLimitPerUser: promoCode.usageLimitPerUser.toString(),
      minOrderAmount: promoCode.minOrderAmount ? promoCode.minOrderAmount.toString() : '',
      isActive: promoCode.isActive,
      description: promoCode.description || '',
    });
    setIsOffcanvasOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!adminUser) {
        toast.error('Vous devez être connecté');
        return;
      }

      if (!formData.code.trim()) {
        toast.error('Le code est requis');
        return;
      }

      if (!formData.value || parseFloat(formData.value) <= 0) {
        toast.error('La valeur doit être supérieure à 0');
        return;
      }

      if (formData.type === 'percentage' && parseFloat(formData.value) > 100) {
        toast.error('Le pourcentage ne peut pas dépasser 100%');
        return;
      }

      const promoCodeData: any = {
        code: formData.code.toUpperCase().trim(),
        type: formData.type,
        value: parseFloat(formData.value),
        application_scope: formData.applicationScope,
        valid_from: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
        valid_until: formData.validUntil ? new Date(formData.validUntil + 'T23:59:59').toISOString() : null,
        usage_limit_per_user: parseInt(formData.usageLimitPerUser) || 1,
        min_order_amount: formData.minOrderAmount ? parseFloat(formData.minOrderAmount) : null,
        is_active: formData.isActive,
        description: formData.description.trim() || null,
        created_by: adminUser.id,
      };

      if (editingPromoCode) {
        const { error } = await supabase
          .from('promo_codes')
          .update(promoCodeData)
          .eq('id', editingPromoCode.id);

        if (error) throw error;
        toast.success('Code promo modifié avec succès');
      } else {
        const { error } = await supabase.from('promo_codes').insert(promoCodeData);

        if (error) throw error;
        toast.success('Code promo créé avec succès');
      }

      setIsOffcanvasOpen(false);
      loadPromoCodes();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce code promo ?')) return;

    try {
      const { error } = await supabase.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
      toast.success('Code promo supprimé avec succès');
      loadPromoCodes();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (promoCode: PromoCode) => {
    try {
      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !promoCode.isActive })
        .eq('id', promoCode.id);

      if (error) throw error;
      toast.success(`Code promo ${promoCode.isActive ? 'désactivé' : 'activé'}`);
      loadPromoCodes();
    } catch (error: any) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const isCodeExpired = (promoCode: PromoCode) => {
    if (!promoCode.validUntil) return false;
    return new Date(promoCode.validUntil) < new Date();
  };

  const isCodeNotYetValid = (promoCode: PromoCode) => {
    if (!promoCode.validFrom) return false;
    return new Date(promoCode.validFrom) > new Date();
  };

  const sortedPromoCodes = useMemo(() => {
    return [...promoCodes].sort((a, b) => {
      // Actifs en premier
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      // Puis par date de création (plus récents en premier)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [promoCodes]);

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Codes promo</h1>
        <Button onClick={handleCreate} className="bg-secondary hover:bg-secondary/90">
          <Plus size={20} className="mr-2" />
          Nouveau code promo
        </Button>
      </div>

      {promoCodes.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucun code promo trouvé. Créez une table "promo_codes" dans Supabase.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPromoCodes.map((promoCode) => {
            const usageCount = usageStats[promoCode.id] || 0;
            const expired = isCodeExpired(promoCode);
            const notYetValid = isCodeNotYetValid(promoCode);

            return (
              <div
                key={promoCode.id}
                className={`bg-white rounded-lg shadow-sm border ${
                  expired ? 'border-red-300' : notYetValid ? 'border-yellow-300' : 'border-gray-200'
                } overflow-hidden flex flex-col h-full`}
              >
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4 flex-shrink-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-text-dark text-xl font-mono">
                          {promoCode.code}
                        </h3>
                        {!promoCode.isActive && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Inactif
                          </span>
                        )}
                        {expired && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Expiré
                          </span>
                        )}
                        {notYetValid && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            Pas encore valide
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl font-bold text-secondary">
                          {promoCode.type === 'percentage'
                            ? `${promoCode.value}%`
                            : formatPrice(promoCode.value)}
                        </span>
                        <span className="text-sm text-gray-500">de réduction</span>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {promoCode.applicationScope === 'item' 
                          ? '📦 Appliqué par article' 
                          : '💰 Appliqué sur le total'}
                      </div>
                      {promoCode.description && (
                        <p className="text-sm text-gray-600 mt-2">{promoCode.description}</p>
                      )}
                      <div className="mt-3 space-y-1 text-xs text-gray-500">
                        {promoCode.validFrom && (
                          <p>
                            Valide à partir du :{' '}
                            {new Date(promoCode.validFrom).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {promoCode.validUntil && (
                          <p>
                            Valide jusqu'au :{' '}
                            {new Date(promoCode.validUntil).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        <p>Limite : {promoCode.usageLimitPerUser} utilisation(s) par utilisateur</p>
                        {promoCode.minOrderAmount && (
                          <p>Montant minimum : {formatPrice(promoCode.minOrderAmount)}</p>
                        )}
                        <p className="flex items-center gap-1 mt-2">
                          <TrendingUp size={14} />
                          {usageCount} utilisation(s)
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-auto pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleToggleActive(promoCode)}
                      className="p-2 text-gray-600 hover:text-gray-900"
                      title={promoCode.isActive ? 'Désactiver' : 'Activer'}
                    >
                      {promoCode.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      onClick={() => handleEdit(promoCode)}
                      className="p-2 text-blue-600 hover:text-blue-900"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(promoCode.id)}
                      className="p-2 text-red-600 hover:text-red-900"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
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
        title={editingPromoCode ? 'Modifier le code promo' : 'Nouveau code promo'}
        position="right"
        width="lg"
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              onClick={() => setIsOffcanvasOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} className="bg-secondary hover:bg-secondary/90 w-full sm:w-auto">
              <Save size={18} className="mr-2" />
              {editingPromoCode ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase().trim() })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary font-mono"
              placeholder="WELCOME10"
            />
            <p className="text-xs text-gray-500 mt-1">Le code sera automatiquement converti en majuscules</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            >
              <option value="percentage">Pourcentage</option>
              <option value="fixed">Montant fixe</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application *</label>
            <select
              value={formData.applicationScope}
              onChange={(e) =>
                setFormData({ ...formData, applicationScope: e.target.value as 'item' | 'total' })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
            >
              <option value="total">Sur le total de l'achat</option>
              <option value="item">Par article</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.applicationScope === 'item'
                ? 'La réduction sera appliquée sur chaque article du panier'
                : 'La réduction sera appliquée sur le montant total de la commande'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valeur * {formData.type === 'percentage' ? '(0-100)' : '(en Ariary)'}
            </label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              placeholder={formData.type === 'percentage' ? '10' : '5000'}
              min="0"
              max={formData.type === 'percentage' ? '100' : undefined}
              step={formData.type === 'percentage' ? '0.1' : '1'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valide à partir du
              </label>
              <input
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valide jusqu'au</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limite d'utilisation par utilisateur *
            </label>
            <input
              type="number"
              value={formData.usageLimitPerUser}
              onChange={(e) => setFormData({ ...formData, usageLimitPerUser: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              min="1"
              placeholder="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Nombre de fois qu'un utilisateur peut utiliser ce code
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant minimum de commande (optionnel)
            </label>
            <input
              type="number"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Montant minimum de commande requis pour utiliser ce code (en Ariary)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
              placeholder="Description du code promo..."
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Actif</span>
            </label>
          </div>
        </div>
      </Offcanvas>
    </div>
  );
}

