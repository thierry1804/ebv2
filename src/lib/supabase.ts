import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Créer un client Supabase uniquement si les variables sont définies
let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Les variables d\'environnement Supabase ne sont pas définies.\n' +
    '📝 Veuillez configurer VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les secrets GitHub Actions.\n' +
    '⚠️  L\'application fonctionnera en mode limité sans Supabase.'
  );
  
  // Créer un client avec des valeurs par défaut pour éviter les erreurs
  // Les appels échoueront mais l'application ne plantera pas
  supabase = createClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.placeholder'
  );
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Désactiver navigator.locks qui peut rester bloqué (crash d'onglet, extensions)
      // et empêcher toutes les requêtes Supabase de se résoudre.
      lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
    },
  });
}

export { supabase };

