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

    try {
      // Vérifier la session existante
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
        } else {
          setAdminUser(session?.user ?? null);
        }
        setIsLoading(false);
      }).catch((error) => {
        console.error('Erreur lors de la récupération de la session:', error);
        setIsLoading(false);
      });

      // Écouter les changements d'authentification
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setAdminUser(session?.user ?? null);
        setIsLoading(false);
      });

      subscription = authSubscription;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
      setIsLoading(false);
    }

    return () => {
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
        toast.error(error.message);
        return false;
      }

      if (data.user) {
        // Vérifier si l'utilisateur est admin (via metadata ou table séparée)
        // Pour l'instant, on accepte tous les utilisateurs authentifiés
        setAdminUser(data.user);
        toast.success('Connexion réussie');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      toast.error('Erreur lors de la connexion');
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
        isAuthenticated: !!adminUser,
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

