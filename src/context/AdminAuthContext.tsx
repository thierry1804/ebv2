import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

interface AdminAuthContextType {
  adminUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'admin@eshopbyvalsue.mg';

// Fonction pour vérifier si un utilisateur est admin
const isAdminUser = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si Supabase est correctement configuré
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      // Supabase n'est pas configuré, on passe en mode non-authentifié
      setIsLoading(false);
      return;
    }

    let subscription: { unsubscribe: () => void } | null = null;
    let isInitialized = false;
    let isMounted = true; // Flag pour éviter les updates après unmount

    const initAuth = async () => {
      try {
        // Récupérer la session existante une seule fois au montage
        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted) {
          // Vérifier que l'utilisateur est bien l'admin
          if (session?.user && isAdminUser(session.user)) {
            setAdminUser(session.user);
          } else {
            setAdminUser(null);
            // Déconnecter si l'utilisateur n'est pas admin
            if (session?.user) {
              await supabase.auth.signOut();
            }
          }
          setIsLoading(false);
          isInitialized = true;
        }

        // S'abonner aux changements d'authentification (login, logout, token refresh)
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          // Ignorer l'événement INITIAL_SESSION car on a déjà la session
          if (event === 'INITIAL_SESSION') return;

          // Mettre à jour uniquement si le composant est toujours monté
          if (isMounted) {
            // Vérifier que l'utilisateur est bien l'admin
            if (session?.user && isAdminUser(session.user)) {
              setAdminUser(session.user);
            } else {
              setAdminUser(null);
              // Déconnecter si l'utilisateur n'est pas admin
              if (session?.user && event !== 'SIGNED_OUT') {
                await supabase.auth.signOut();
              }
            }
          }
        });

        subscription = authSubscription;
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Vérifier si Supabase est configuré
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      toast.error('Supabase n\'est pas configuré. Veuillez configurer les variables d\'environnement.');
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erreur de connexion Supabase:', {
          message: error.message,
          status: error.status,
          name: error.name,
        });

        // Gérer spécifiquement les différents types d'erreurs
        if (error.status === 429) {
          toast.error('Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.');
        } else if (error.status === 400) {
          // Erreur 400 peut signifier plusieurs choses
          if (error.message?.includes('Invalid login credentials') || error.message?.includes('Invalid email or password')) {
            toast.error('Email ou mot de passe incorrect');
          } else if (error.message?.includes('Email not confirmed')) {
            toast.error('Votre email n\'a pas été confirmé. Vérifiez votre boîte de réception.');
          } else {
            toast.error(error.message || 'Erreur de connexion. Vérifiez vos identifiants.');
          }
        } else {
          toast.error(error.message || 'Erreur lors de la connexion');
        }
        return false;
      }

      if (data.user) {
        // Vérifier que l'utilisateur est bien l'admin
        if (isAdminUser(data.user)) {
          setAdminUser(data.user);
          toast.success('Connexion réussie');
          return true;
        } else {
          // Déconnecter l'utilisateur s'il n'est pas admin
          await supabase.auth.signOut();
          toast.error('Accès refusé. Seul l\'administrateur peut accéder à cette section.');
          return false;
        }
      }

      return false;
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      // Gérer les erreurs 429 dans les exceptions
      if (error?.status === 429 || error?.message?.includes('429')) {
        toast.error('Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.');
      } else if (error?.status === 400) {
        toast.error('Erreur de connexion. Vérifiez vos identifiants.');
      } else {
        toast.error('Erreur lors de la connexion');
      }
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
        await supabase.auth.signOut();
      }
      setAdminUser(null);
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      setAdminUser(null);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        isLoading,
        login,
        logout,
        isAuthenticated: !!adminUser && isAdminUser(adminUser),
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

