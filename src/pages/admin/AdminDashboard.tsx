import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FileText, ShoppingBag, TrendingUp, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminDashboard() {
  const { adminUser } = useAdminAuth();
  const [stats, setStats] = useState({
    users: 0,
    articles: 0,
    products: 0,
    orders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    // Charger les stats une seule fois au montage
    // Ne pas dépendre de adminUser pour éviter les rechargements inutiles
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    try {
      let errors = false;

      // Compter les utilisateurs
      const { count: usersCount, error: usersError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });
      if (usersError) {
        if (usersError.code === 'PGRST116') {
          // Table n'existe pas
        } else if (usersError.code === '42501' || usersError.message.includes('403')) {
          // Permission denied
          errors = true;
        }
      }

      // Compter les articles
      const { count: articlesCount, error: articlesError } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true });
      if (articlesError) {
        if (articlesError.code === 'PGRST116') {
          // Table n'existe pas
        } else if (articlesError.code === '42501' || articlesError.message.includes('403')) {
          errors = true;
        }
      }

      // Compter les produits
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (productsError) {
        if (productsError.code === 'PGRST116') {
          // Table n'existe pas
        } else if (productsError.code === '42501' || productsError.message.includes('403')) {
          errors = true;
        }
      }

      // Compter les commandes
      const { count: ordersCount, error: ordersError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      if (ordersError) {
        if (ordersError.code === 'PGRST116') {
          // Table n'existe pas
        } else if (ordersError.code === '42501' || ordersError.message.includes('403')) {
          errors = true;
        }
      }

      setHasErrors(errors);
      setStats({
        users: usersError ? 0 : usersCount || 0,
        articles: articlesError ? 0 : articlesCount || 0,
        products: productsError ? 0 : productsCount || 0,
        orders: ordersError ? 0 : ordersCount || 0,
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      setHasErrors(true);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Utilisateurs',
      value: stats.users,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Articles',
      value: stats.articles,
      icon: FileText,
      color: 'bg-green-500',
    },
    {
      title: 'Produits',
      value: stats.products,
      icon: ShoppingBag,
      color: 'bg-purple-500',
    },
    {
      title: 'Commandes',
      value: stats.orders,
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-heading font-bold text-text-dark mb-8">Dashboard</h1>

      {hasErrors && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-800 mb-1">Configuration requise</h3>
            <p className="text-sm text-yellow-700 mb-2">
              Les politiques de sécurité (RLS) de Supabase bloquent l'accès aux tables. 
              Veuillez configurer les politiques RLS selon les instructions dans{' '}
              <code className="bg-yellow-100 px-1 rounded">BACKOFFICE_SETUP.md</code>.
            </p>
            <p className="text-sm text-yellow-700">
              Pour le développement, vous pouvez utiliser des politiques qui permettent 
              à tous les utilisateurs authentifiés d'accéder aux tables.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-text-dark">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-heading font-semibold text-text-dark mb-4">
          Bienvenue dans le backoffice
        </h2>
        <p className="text-gray-600 mb-4">
          Utilisez le menu de navigation pour gérer le contenu de votre site.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-text-dark mb-2">📝 Articles</h3>
            <p className="text-sm text-gray-600">
              Gérez les articles de blog, créez de nouveaux contenus et modifiez les existants.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-text-dark mb-2">👥 Utilisateurs</h3>
            <p className="text-sm text-gray-600">
              Consultez et gérez les comptes utilisateurs, leurs commandes et leurs données.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-text-dark mb-2">🛍️ Produits</h3>
            <p className="text-sm text-gray-600">
              Ajoutez, modifiez et gérez votre catalogue de produits.
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-text-dark mb-2">⚙️ Contenu</h3>
            <p className="text-sm text-gray-600">
              Modifiez le contenu statique du site (pages, textes, etc.).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
