import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { GoogleAnalytics } from './components/analytics/GoogleAnalytics';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { PageLoading } from './components/ui/PageLoading';
import { MaintenanceGate } from './components/MaintenanceGate';

// Lazy load des pages publiques
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Account = lazy(() => import('./pages/Account'));
const Orders = lazy(() => import('./pages/Orders'));
const Login = lazy(() => import('./pages/Login'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Legal = lazy(() => import('./pages/Legal'));
const NewsletterUnsubscribe = lazy(() => import('./pages/NewsletterUnsubscribe'));

// Lazy load des pages admin
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminSignup = lazy(() => import('./pages/admin/AdminSignup')); // PAGE TEMPORAIRE - À SUPPRIMER
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminArticles = lazy(() => import('./pages/admin/AdminArticles'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminContent = lazy(() => import('./pages/admin/AdminContent'));
const AdminLandingPage = lazy(() => import('./pages/admin/AdminLandingPage'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminPromoCodes = lazy(() => import('./pages/admin/AdminPromoCodes'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminSiteSettings = lazy(() => import('./pages/admin/AdminSiteSettings'));
const AdminGallery = lazy(() => import('./pages/admin/AdminGallery'));
const AdminNewsletter = lazy(() => import('./pages/admin/AdminNewsletter'));
const AdminChat = lazy(() => import('./pages/admin/AdminChat'));

// Composant de chargement (pour les pages lazy-load)
const LoadingFallback = () => <PageLoading />;

function App() {
  return (
    <BrowserRouter>
      <ConfirmProvider>
      <GoogleAnalytics />
      <MaintenanceGate>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Routes publiques */}
                <Route
                  path="/*"
                  element={
                    <Layout>
                      <Suspense fallback={<LoadingFallback />}>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          <Route path="/boutique" element={<Shop />} />
                          <Route path="/produit/:id" element={<ProductDetail />} />
                          <Route path="/panier" element={<Cart />} />
                          <Route path="/checkout" element={<Checkout />} />
                          <Route path="/compte" element={<Account />} />
                          <Route path="/compte/mes-commandes" element={<Orders />} />
                          <Route path="/connexion" element={<Login />} />
                          <Route path="/wishlist" element={<Wishlist />} />
                          <Route path="/blog" element={<Blog />} />
                          <Route path="/blog/:id" element={<BlogDetail />} />
                          <Route path="/a-propos" element={<About />} />
                          <Route path="/contact" element={<Contact />} />
                          <Route path="/mentions-legales" element={<Legal />} />
                          <Route path="/cgv" element={<Legal />} />
                          <Route path="/confidentialite" element={<Legal />} />
                          <Route path="/retours" element={<Legal />} />
                          <Route path="/newsletter/desabonner" element={<NewsletterUnsubscribe />} />
                        </Routes>
                      </Suspense>
                    </Layout>
                  }
                />

                {/* Un seul AdminAuthProvider pour tout /admin : évite le remontage login → dashboard
                    (sinon isLoading repart à true et getSession peut rester bloqué dans certains navigateurs). */}
                <Route
                  path="/admin"
                  element={
                    <AdminAuthProvider>
                      <Outlet />
                    </AdminAuthProvider>
                  }
                >
                  <Route path="login" element={<AdminLogin />} />
                  <Route path="signup" element={<AdminSignup />} /> {/* TEMPORAIRE - À SUPPRIMER */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AdminLayout>
                          <Suspense fallback={<LoadingFallback />}>
                            <Outlet />
                          </Suspense>
                        </AdminLayout>
                      </ProtectedRoute>
                    }
                  >
                    <Route index element={<AdminDashboard />} />
                    <Route path="articles" element={<AdminArticles />} />
                    <Route path="utilisateurs" element={<AdminUsers />} />
                    <Route path="produits" element={<AdminProducts />} />
                    <Route path="contenu" element={<AdminContent />} />
                    <Route path="landing-page" element={<AdminLandingPage />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="codes-promo" element={<AdminPromoCodes />} />
                    <Route path="commandes" element={<AdminOrders />} />
                    <Route path="parametres-site" element={<AdminSiteSettings />} />
                    <Route path="galerie" element={<AdminGallery />} />
                    <Route path="newsletter" element={<AdminNewsletter />} />
                    <Route path="chat" element={<AdminChat />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
      </MaintenanceGate>
      </ConfirmProvider>
    </BrowserRouter>
  );
}

export default App;
