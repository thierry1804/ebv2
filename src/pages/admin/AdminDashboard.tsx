import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, FileText, ShoppingBag, TrendingUp, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { PageLoading } from '../../components/ui/PageLoading';

const ADMIN_DASHBOARD_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: number | undefined;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error(`${label} timeout`));
      }, timeoutMs);
    }),
  ]).finally(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
  });
}

export default function AdminDashboard() {
  useAdminAuth();
  const hasLoadedStatsRef = useRef(false);
  const [stats, setStats] = useState({
    users: 0,
    articles: 0,
    products: 0,
    orders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    if (hasLoadedStatsRef.current) return;
    hasLoadedStatsRef.current = true;
    // Charger les stats une seule fois au montage
    // Ne pas dépendre de adminUser pour éviter les rechargements inutiles
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    try {
      let errors = false;

      const [usersResult, articlesResult, productsResult, ordersResult] = await Promise.allSettled([
        withTimeout(
          supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
          ADMIN_DASHBOARD_TIMEOUT_MS,
          'user_profiles count',
        ),
        withTimeout(
          supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
          ADMIN_DASHBOARD_TIMEOUT_MS,
          'blog_posts count',
        ),
        withTimeout(
          supabase.from('products').select('*', { count: 'exact', head: true }),
          ADMIN_DASHBOARD_TIMEOUT_MS,
          'products count',
        ),
        withTimeout(
          supabase.from('orders').select('*', { count: 'exact', head: true }),
          ADMIN_DASHBOARD_TIMEOUT_MS,
          'orders count',
        ),
      ]);

      const unwrapCount = (
        result: PromiseSettledResult<{ count: number | null; error: any }>,
        label: string,
      ): { count: number; hasError: boolean } => {
        if (result.status === 'rejected') {
          const reason =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          console.warn(`[AdminDashboard] ${label}: ${reason}`);
          return { count: 0, hasError: true };
        }

        const { count, error } = result.value;
        if (error) {
          if (error.code === 'PGRST116') {
            return { count: 0, hasError: false };
          }
          if (error.code === '42501' || error.message?.includes('403')) {
            return { count: 0, hasError: true };
          }
          console.warn(`[AdminDashboard] ${label}: ${error.message || 'unknown error'}`);
          return { count: 0, hasError: true };
        }
        return { count: count || 0, hasError: false };
      };

      const users = unwrapCount(usersResult, 'user_profiles');
      const articles = unwrapCount(articlesResult, 'blog_posts');
      const products = unwrapCount(productsResult, 'products');
      const orders = unwrapCount(ordersResult, 'orders');

      errors = users.hasError || articles.hasError || products.hasError || orders.hasError;

      setHasErrors(errors);
      setStats({
        users: users.count,
        articles: articles.count,
        products: products.count,
        orders: orders.count,
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
    return <PageLoading />;
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
              Certaines requêtes Supabase ont échoué ou expiré (timeout réseau / RLS).
              Vérifiez la connectivité puis les politiques RLS selon les instructions dans{' '}
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
