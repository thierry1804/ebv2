import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Trash2, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  created_at: string;
  last_login?: string;
}

export default function AdminUsers() {
  const { isAuthenticated } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Charger les utilisateurs une seule fois au montage
    if (isAuthenticated) {
      loadUsers();
    } else {
      setIsLoading(false);
      setError('Vous devez être connecté pour voir les utilisateurs');
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Vérifier la session actuelle
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Vous n\'êtes pas authentifié. Veuillez vous reconnecter.');
        setIsLoading(false);
        return;
      }

      // Récupérer les utilisateurs depuis la table user_profiles
      const { data: usersData, error: queryError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, phone, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (queryError) {
        console.error('Erreur lors de la récupération des utilisateurs:', queryError);
        
        // Analyser le type d'erreur
        if (queryError.code === 'PGRST116' || queryError.message?.includes('relation') || queryError.message?.includes('does not exist')) {
          setError('La table "user_profiles" n\'existe pas dans Supabase. Créez cette table pour afficher les utilisateurs.');
        } else if (queryError.code === '42501' || queryError.message?.includes('permission') || queryError.message?.includes('policy')) {
          setError('Erreur de permissions RLS. Vérifiez que la politique "Authenticated users can read all profiles" existe sur la table user_profiles.');
          toast.error('Erreur de permissions. Vérifiez les politiques RLS dans Supabase.');
        } else {
          setError(`Erreur: ${queryError.message || 'Erreur inconnue lors du chargement des utilisateurs'}`);
          toast.error(`Erreur: ${queryError.message || 'Erreur lors du chargement des utilisateurs'}`);
        }
        setUsers([]);
        return;
      }

      if (!usersData || usersData.length === 0) {
        setError('Aucun utilisateur trouvé dans la table user_profiles. Les utilisateurs sont créés automatiquement lors de l\'inscription.');
        setUsers([]);
        return;
      }

      // Filtrer l'admin de la liste
      const adminEmail = 'admin@eshopbyvalsue.mg';
      const filteredUsers = usersData.filter((user: any) => {
        const userEmail = user.email?.toLowerCase() || '';
        return userEmail !== adminEmail.toLowerCase();
      });

      // Récupérer toutes les adresses pour tous les utilisateurs
      const userIds = filteredUsers.map((u: any) => u.id);
      
      let addressesMap: Record<string, string | undefined> = {};
      
      if (userIds.length > 0) {
        const { data: addressesData, error: addressesError } = await supabase
          .from('user_addresses')
          .select('user_id, phone, is_default, created_at')
          .in('user_id', userIds);

        if (!addressesError && addressesData && addressesData.length > 0) {
          // Grouper les adresses par user_id
          const addressesByUser: Record<string, any[]> = {};
          addressesData.forEach((addr: any) => {
            const userId = addr.user_id;
            if (!addressesByUser[userId]) {
              addressesByUser[userId] = [];
            }
            addressesByUser[userId].push(addr);
          });

          // Pour chaque utilisateur, trouver le téléphone approprié
          Object.keys(addressesByUser).forEach((userId) => {
            const userAddresses = addressesByUser[userId];
            
            // Chercher d'abord l'adresse par défaut
            const defaultAddress = userAddresses.find((addr: any) => addr.is_default === true);
            
            if (defaultAddress && defaultAddress.phone) {
              addressesMap[userId] = defaultAddress.phone;
            } else {
              // Sinon, prendre la dernière adresse créée (la plus récente)
              const sortedAddresses = userAddresses.sort((a: any, b: any) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA; // Plus récente en premier
              });
              
              if (sortedAddresses.length > 0 && sortedAddresses[0].phone) {
                addressesMap[userId] = sortedAddresses[0].phone;
              }
            }
          });
        }
      }

      // Mapper les utilisateurs avec le téléphone depuis les adresses
      const mappedUsers = filteredUsers.map((user: any) => {
        // Récupérer le téléphone depuis les adresses (priorité à l'adresse par défaut, sinon la dernière)
        const phoneFromAddress = addressesMap[user.id];

        return {
          id: user.id,
          email: user.email || '',
          first_name: user.first_name || undefined,
          last_name: user.last_name || undefined,
          phone: phoneFromAddress || user.phone || undefined, // Priorité au téléphone de l'adresse
          created_at: user.created_at || new Date().toISOString(),
          last_login: user.last_login || undefined,
        };
      });
      
      setUsers(mappedUsers);
      if (mappedUsers.length === 0) {
        setError('Aucun utilisateur trouvé dans la table user_profiles. Les utilisateurs sont créés automatiquement lors de l\'inscription.');
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setError(`Erreur: ${error.message || 'Erreur inconnue'}`);
      toast.error('Erreur lors du chargement des utilisateurs');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase.from('user_profiles').delete().eq('id', id);
      if (error) throw error;
      toast.success('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-text-dark">Utilisateurs</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Téléphone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Inscription
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  {error ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-red-600">{error}</p>
                      {error.includes('RLS') && (
                        <p className="text-sm text-gray-600 mt-2">
                          Exécutez ce SQL dans Supabase pour créer la politique :
                          <code className="block mt-2 p-2 bg-gray-100 rounded text-xs text-left">
                            CREATE POLICY "Authenticated users can read all profiles" ON user_profiles<br/>
                            &nbsp;&nbsp;FOR SELECT USING (auth.role() = 'authenticated');
                          </code>
                        </p>
                      )}
                    </div>
                  ) : users.length === 0 ? (
                    'Aucun utilisateur trouvé. Les utilisateurs sont créés automatiquement lors de l\'inscription.'
                  ) : (
                    'Aucun utilisateur ne correspond à votre recherche'
                  )}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-text-dark">
                      {user.first_name || user.last_name
                        ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                        : 'Non renseigné'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail size={16} />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.phone ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} />
                        {user.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(user.id)}
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

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note :</strong> Pour afficher les utilisateurs, créez une table{' '}
          <code className="bg-blue-100 px-1 rounded">user_profiles</code> dans Supabase qui
          référence les utilisateurs de <code className="bg-blue-100 px-1 rounded">auth.users</code>.
          Vous pouvez également créer une fonction Edge pour récupérer les utilisateurs
          authentifiés.
        </p>
      </div>
    </div>
  );
}

