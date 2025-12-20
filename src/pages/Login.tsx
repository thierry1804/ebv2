import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const success = await login(email, password);
      if (success) {
        toast.success('Connexion réussie');
        navigate('/compte');
      } else {
        toast.error('Email ou mot de passe incorrect');
      }
    } else {
      const success = await register(email, password, firstName, lastName);
      if (success) {
        toast.success('Inscription réussie');
        navigate('/compte');
      } else {
        toast.error('Erreur lors de l\'inscription');
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg p-8 shadow-sm">
        <h1 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
          {isLogin ? 'Connexion' : 'Inscription'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">Prénom</label>
                <input
                  type="text"
                  required={!isLogin}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">Nom</label>
                <input
                  type="text"
                  required={!isLogin}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-neutral-support rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full">
            {isLogin ? 'Se connecter' : 'S\'inscrire'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-text-dark/80 hover:text-secondary transition-colors"
          >
            {isLogin
              ? 'Pas encore de compte ? S\'inscrire'
              : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}

