import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/admin/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { GoogleAnalytics } from './components/analytics/GoogleAnalytics';

// Lazy load des pages publiques
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Account = lazy(() => import('./pages/Account'));
const Login = lazy(() => import('./pages/Login'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Legal = lazy(() => import('./pages/Legal'));

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

// Composant de chargement
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
      <p className="text-text-dark/80">Chargement...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <GoogleAnalytics />
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
                        </Routes>
                      </Suspense>
                    </Layout>
                  }
                />

                {/* Routes admin - AdminAuthProvider uniquement pour les routes admin */}
                <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
                <Route path="/admin/signup" element={<AdminAuthProvider><AdminSignup /></AdminAuthProvider>} /> {/* TEMPORAIRE - À SUPPRIMER */}
                <Route
                  path="/admin/*"
                  element={
                    <AdminAuthProvider>
                      <ProtectedRoute>
                        <AdminLayout>
                          <Suspense fallback={<LoadingFallback />}>
                            <Routes>
                              <Route path="/" element={<AdminDashboard />} />
                              <Route path="/articles" element={<AdminArticles />} />
                              <Route path="/utilisateurs" element={<AdminUsers />} />
                              <Route path="/produits" element={<AdminProducts />} />
                              <Route path="/contenu" element={<AdminContent />} />
                              <Route path="/landing-page" element={<AdminLandingPage />} />
                              <Route path="/categories" element={<AdminCategories />} />
                              <Route path="/codes-promo" element={<AdminPromoCodes />} />
                            </Routes>
                          </Suspense>
                        </AdminLayout>
                      </ProtectedRoute>
                    </AdminAuthProvider>
                  }
                />
              </Routes>
            </Suspense>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
