import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

/**
 * PAGE D'INSCRIPTION ADMIN - À UTILISER UNE SEULE FOIS
 *
 * Cette page permet de créer le premier compte administrateur.
 * IMPORTANT: Supprimez cette page ou commentez la route après avoir créé votre admin!
 *
 * Pour l'utiliser:
 * 1. Ajoutez la route dans App.tsx: <Route path="/admin/signup" element={<AdminSignup />} />
 * 2. Accédez à /admin/signup dans votre navigateur
 * 3. Créez votre compte admin
 * 4. Supprimez cette page et la route pour des raisons de sécurité
 */
export default function AdminSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'admin', // Marquer comme admin dans les metadata
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success(
          'Compte admin créé avec succès! Vérifiez votre email pour confirmer.',
          { duration: 5000 }
        );

        // Afficher un message d'avertissement
        setTimeout(() => {
          toast(
            '⚠️ IMPORTANT: Supprimez maintenant cette page AdminSignup.tsx pour la sécurité!',
            { duration: 10000, icon: '🔒' }
          );
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la création du compte:', error);
      toast.error('Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Avertissement de sécurité */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">
            ⚠️ PAGE TEMPORAIRE - À SUPPRIMER APRÈS UTILISATION
          </p>
          <p className="text-red-600 text-xs mt-1">
            Cette page ne doit être utilisée qu'une seule fois pour créer le premier admin.
            Supprimez-la immédiatement après!
          </p>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-secondary mb-2">
            Créer un compte admin
          </h1>
          <p className="text-gray-600">Premier administrateur ByValsue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              placeholder="admin@byvalsue.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-secondary hover:bg-secondary/90 text-white"
          >
            {isLoading ? 'Création...' : 'Créer le compte admin'}
          </Button>
        </form>

        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-xs">
            💡 Après avoir créé votre compte, vérifiez votre email pour le confirmer,
            puis supprimez cette page AdminSignup.tsx et sa route dans App.tsx.
          </p>
        </div>
      </div>
    </div>
  );
}
