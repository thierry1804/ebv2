import { ReactNode, useState, useRef } from 'react';
import { AdminMainScrollContext } from '../../context/AdminMainScrollContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard,
  FileText,
  Users,
  ShoppingBag,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Layout,
  Tags,
  Ticket,
  Package,
  Wrench,
  Image,
  Mail,
  MessageCircle,
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { logout, adminUser } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/categories', icon: Tags, label: 'Catégories' },
    { path: '/admin/produits', icon: ShoppingBag, label: 'Produits' },
    { path: '/admin/commandes', icon: Package, label: 'Commandes' },
    { path: '/admin/codes-promo', icon: Ticket, label: 'Codes promo' },
    { path: '/admin/utilisateurs', icon: Users, label: 'Utilisateurs' },
    { path: '/admin/articles', icon: FileText, label: 'Articles de blog' },
    { path: '/admin/contenu', icon: Settings, label: 'Contenu du site' },
    { path: '/admin/landing-page', icon: Layout, label: 'Landing Page' },
    { path: '/admin/galerie', icon: Image, label: 'Galerie' },
    { path: '/admin/newsletter', icon: Mail, label: 'Newsletter' },
    { path: '/admin/chat', icon: MessageCircle, label: 'Chat en direct' },
    { path: '/admin/parametres-site', icon: Wrench, label: 'Paramètres site' },
  ];

  return (
    <div className="h-dvh max-h-dvh overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex min-h-0 w-64 flex-col bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Logo */}
          <div className="flex shrink-0 items-center justify-between p-6 border-b">
            <Link to="/admin" className="text-2xl font-heading font-bold text-secondary">
              ByValsue Admin
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation — scroll si trop d’entrées (mobile / petit écran) */}
          <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-secondary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="shrink-0 p-4 border-t bg-white">
            <div className="mb-4 px-4 py-2 text-sm text-gray-600">
              <p className="font-medium">{adminUser?.email}</p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 mb-2"
            >
              <Home size={20} />
              <span className="font-medium">Retour au site</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Colonne principale : scroll unique ici (évite double barre body + menu) */}
      <div className="flex h-full min-h-0 min-w-0 flex-col lg:pl-64">
        <AdminMainScrollContext.Provider value={mainScrollRef}>
          <header className="z-30 shrink-0 border-b border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-heading font-semibold text-text-dark">
                Administration
              </h1>
              <div className="w-6" /> {/* Spacer pour centrer */}
            </div>
          </header>

          <main
            ref={mainScrollRef}
            className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-6 [touch-action:pan-y]"
          >
            {children}
          </main>
        </AdminMainScrollContext.Provider>
      </div>
    </div>
  );
}

