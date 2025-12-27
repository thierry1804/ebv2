import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, firstName: string, lastName: string, phone?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache simple pour éviter les appels multiples au même profil
const profileCache = new Map<string, { user: User | null; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// Fonction pour charger le profil utilisateur depuis user_profiles avec retry optimisé
const loadUserProfile = async (userId: string, retries = 1, delay = 300): Promise<User | null> => {
  // Vérifier le cache d'abord
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.user;
  }

  // Réduire les retries pour optimiser (1 seule tentative par défaut)
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Utiliser maybeSingle() au lieu de single() pour éviter l'erreur 406

      if (error) {
        // Ne pas retry pour les erreurs "pas de résultat" - c'est normal si le profil n'existe pas encore
        if (error.code === 'PGRST116') {
          // Mettre en cache null pour éviter les appels répétés
          profileCache.set(userId, { user: null, timestamp: Date.now() });
          return null;
        }
        // Ne logger que les vraies erreurs
        if (error.code !== 'PGRST116') {
          console.error('Erreur lors du chargement du profil:', error);
        }
        // Mettre en cache null pour éviter les appels répétés en cas d'erreur
        if (i === retries - 1) {
          profileCache.set(userId, { user: null, timestamp: Date.now() });
        }
        return null;
      }

      if (data) {
        const user: User = {
          id: data.id,
          email: data.email,
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          phone: data.phone || undefined,
        };
        // Mettre en cache
        profileCache.set(userId, { user, timestamp: Date.now() });
        return user;
      }

      // Pas de données mais pas d'erreur (profil n'existe pas encore)
      // Mettre en cache null pour éviter les appels répétés
      profileCache.set(userId, { user: null, timestamp: Date.now() });
      return null;
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // Mettre en cache null pour éviter les appels répétés
      profileCache.set(userId, { user: null, timestamp: Date.now() });
      return null;
    }
  }
  return null;
};

// Fonction pour invalider le cache d'un profil
const invalidateProfileCache = (userId: string) => {
  profileCache.delete(userId);
};

// Fonction pour créer le profil manuellement si le trigger ne l'a pas fait
const createUserProfile = async (
  userId: string,
  email: string,
  firstName?: string,
  lastName?: string,
  phone?: string
): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
      })
      .select()
      .single();

    if (error) {
      // Si le profil existe déjà (créé entre-temps par le trigger), essayer de le charger
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        console.log('Le profil existe déjà, chargement...');
        return await loadUserProfile(userId, 1, 200);
      }
      console.error('Erreur lors de la création du profil:', error);
      return null;
    }

    if (data) {
      const user: User = {
        id: data.id,
        email: data.email,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        phone: data.phone || undefined,
      };
      // Mettre en cache
      profileCache.set(userId, { user, timestamp: Date.now() });
      return user;
    }

    return null;
  } catch (error) {
    console.error('Erreur lors de la création du profil:', error);
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Vérifier si Supabase est correctement configuré
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
        // Supabase n'est pas configuré, on passe en mode non-authentifié
        setIsLoading(false);
        return;
      }

      let subscription: { unsubscribe: () => void } | null = null;
      let isMounted = true;

      const initAuth = async () => {
        try {
          // Récupérer la session existante
          const { data: { session } } = await supabase.auth.getSession();

          if (isMounted) {
            if (session?.user) {
              // Charger le profil utilisateur (1 seule tentative, rapide)
              const userProfile = await loadUserProfile(session.user.id, 1, 200);
              // Si le profil n'existe pas, créer un utilisateur temporaire avec les métadonnées
              if (!userProfile) {
                const tempUser: User = {
                  id: session.user.id,
                  email: session.user.email || '',
                  firstName: session.user.user_metadata?.first_name || '',
                  lastName: session.user.user_metadata?.last_name || '',
                  phone: session.user.user_metadata?.phone || undefined,
                };
                setUser(tempUser);
              } else {
                setUser(userProfile);
              }
            } else {
              setUser(null);
            }
            setIsLoading(false);
          }

          // S'abonner aux changements d'authentification
          const {
            data: { subscription: authSubscription },
          } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'INITIAL_SESSION') return;

            if (isMounted) {
              try {
                if (session?.user) {
                  // Charger le profil utilisateur (1 seule tentative, rapide)
                  const userProfile = await loadUserProfile(session.user.id, 1, 200);
                  // Si le profil n'existe pas, créer un utilisateur temporaire avec les métadonnées
                  if (!userProfile) {
                    const tempUser: User = {
                      id: session.user.id,
                      email: session.user.email || '',
                      firstName: session.user.user_metadata?.first_name || '',
                      lastName: session.user.user_metadata?.last_name || '',
                      phone: session.user.user_metadata?.phone || undefined,
                    };
                    setUser(tempUser);
                  } else {
                    setUser(userProfile);
                  }
                } else {
                  setUser(null);
                  // Nettoyer le cache si l'utilisateur se déconnecte
                  if (session === null) {
                    profileCache.clear();
                  }
                }
              } catch (error) {
                console.error('Erreur lors du chargement du profil dans onAuthStateChange:', error);
                // En cas d'erreur, mettre à jour avec les métadonnées de base
                if (session?.user) {
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    firstName: session.user.user_metadata?.first_name || '',
                    lastName: session.user.user_metadata?.last_name || '',
                    phone: session.user.user_metadata?.phone || undefined,
                  });
                } else {
                  setUser(null);
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
    } catch (error) {
      console.error('Erreur critique dans AuthProvider useEffect:', error);
      setIsLoading(false);
    }
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
        console.error('Erreur de connexion Supabase:', error);

        if (error.status === 429) {
          toast.error('Trop de tentatives de connexion. Veuillez patienter quelques instants avant de réessayer.');
        } else if (error.status === 400) {
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
        // Créer un utilisateur temporaire immédiatement avec les métadonnées
        // pour ne pas bloquer l'interface
        const tempUser: User = {
          id: data.user.id,
          email: data.user.email || '',
          firstName: data.user.user_metadata?.first_name || '',
          lastName: data.user.user_metadata?.last_name || '',
          phone: data.user.user_metadata?.phone || undefined,
        };
        setUser(tempUser);

        // En arrière-plan, essayer de charger le profil depuis user_profiles
        // mais ne pas bloquer si ça échoue (1 seule tentative, rapide)
        setTimeout(() => {
          (async () => {
            try {
              const userProfile = await loadUserProfile(data.user.id, 1, 200);
              if (userProfile) {
                setUser(userProfile);
              }
            } catch (error) {
              console.error('Erreur lors du chargement du profil en arrière-plan:', error);
              // On garde l'utilisateur temporaire, pas de problème
            }
          })();
        }, 0);

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
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

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string
  ): Promise<boolean> => {
    // Vérifier si Supabase est configuré
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      toast.error('Supabase n\'est pas configuré. Veuillez configurer les variables d\'environnement.');
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
          },
        },
      });

      if (error) {
        console.error('Erreur d\'inscription Supabase:', error);
        
        // Détecter différents types d'erreurs
        const errorMessage = error.message?.toLowerCase() || '';
        if (
          errorMessage.includes('user already registered') ||
          errorMessage.includes('already registered') ||
          errorMessage.includes('email address is already in use') ||
          error.status === 422
        ) {
          // Lancer une erreur spéciale pour que Checkout puisse la gérer
          const customError: any = new Error('EMAIL_EXISTS');
          customError.originalError = error;
          throw customError;
        } else if (errorMessage.includes('password')) {
          toast.error('Le mot de passe doit contenir au moins 6 caractères');
        } else {
          toast.error(error.message || 'Erreur lors de l\'inscription');
        }
        return false;
      }

      if (data.user) {
        // Récupérer les métadonnées de l'utilisateur
        const userMetadata = data.user.user_metadata || {};
        const userEmail = data.user.email || email;
        const userFirstName = userMetadata.first_name || firstName;
        const userLastName = userMetadata.last_name || lastName;
        const userPhone = userMetadata.phone || phone;

        // Créer un utilisateur temporaire immédiatement avec les métadonnées
        // pour ne pas bloquer l'interface
        const tempUser: User = {
          id: data.user.id,
          email: userEmail,
          firstName: userFirstName || '',
          lastName: userLastName || '',
          phone: userPhone || undefined,
        };
        setUser(tempUser);

        // En arrière-plan, essayer de charger/créer le profil
        // mais ne pas bloquer si ça échoue
        setTimeout(() => {
          (async () => {
            try {
              // Attendre un peu pour que le trigger crée le profil
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Charger le profil utilisateur (1 seule tentative, rapide)
              let userProfile = await loadUserProfile(data.user.id, 1, 200);
              
              // Si le profil n'existe toujours pas, essayer de le créer manuellement (rapide, timeout court)
              if (!userProfile) {
                userProfile = await Promise.race([
                  createUserProfile(
                    data.user.id,
                    userEmail,
                    userFirstName,
                    userLastName,
                    userPhone
                  ),
                  new Promise<User | null>(resolve => setTimeout(() => resolve(null), 1000))
                ]);
              }

              // Si on a réussi à charger/créer le profil, mettre à jour l'utilisateur
              if (userProfile) {
                setUser(userProfile);
              }
            } catch (error) {
              console.error('Erreur lors du chargement du profil en arrière-plan:', error);
              // On garde l'utilisateur temporaire, pas de problème
            }
          })();
        }, 0);

        return true;
      }

      return false;
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      if (error.message === 'EMAIL_EXISTS') {
        throw error; // Re-lancer pour que Checkout puisse le gérer
      }
      toast.error('Erreur lors de l\'inscription');
      return false;
    }
  };

  const logout = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('placeholder')) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Erreur lors de la déconnexion Supabase:', error);
          // Continuer quand même avec le nettoyage local
        }
      }
      
      // Nettoyer l'état utilisateur
      setUser(null);
      
      // Nettoyer le cache du profil
      profileCache.clear();
      
      // Nettoyer le localStorage (panier et wishlist)
      try {
        localStorage.removeItem('eshop_cart');
        localStorage.removeItem('eshop_wishlist');
      } catch (storageError) {
        console.error('Erreur lors du nettoyage du localStorage:', storageError);
      }
      
      // Déclencher un événement pour notifier les autres contextes
      window.dispatchEvent(new CustomEvent('user-logout'));
      
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // Nettoyer quand même l'état local même en cas d'erreur
      setUser(null);
      profileCache.clear();
      try {
        localStorage.removeItem('eshop_cart');
        localStorage.removeItem('eshop_wishlist');
      } catch (storageError) {
        console.error('Erreur lors du nettoyage du localStorage:', storageError);
      }
      
      // Déclencher un événement pour notifier les autres contextes
      window.dispatchEvent(new CustomEvent('user-logout'));
      
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // S'assurer que le contexte est toujours fourni, même en cas d'erreur
  const contextValue: AuthContextType = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
