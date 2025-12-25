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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const validateField = (name: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (name) {
      case 'email':
        if (!value.trim()) {
          newErrors.email = 'L\'email est requis';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'L\'email n\'est pas valide';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value) {
          newErrors.password = 'Le mot de passe est requis';
        } else if (!isLogin && value.length < 6) {
          newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
        } else {
          delete newErrors.password;
        }
        break;
      case 'firstName':
        if (!isLogin && !value.trim()) {
          newErrors.firstName = 'Le prénom est requis';
        } else {
          delete newErrors.firstName;
        }
        break;
      case 'lastName':
        if (!isLogin && !value.trim()) {
          newErrors.lastName = 'Le nom est requis';
        } else {
          delete newErrors.lastName;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Valider tous les champs
    validateField('email', email);
    validateField('password', password);
    if (!isLogin) {
      validateField('firstName', firstName);
      validateField('lastName', lastName);
    }
    
    // Si erreurs, ne pas soumettre
    if (Object.keys(errors).length > 0) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    setIsLoading(true);
    
    try {
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg p-8 shadow-sm">
        <h1 className="text-3xl font-heading font-bold text-text-dark mb-8 text-center">
          {isLogin ? 'Connexion' : 'Inscription'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={!isLogin}
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    validateField('firstName', e.target.value);
                  }}
                  onBlur={(e) => validateField('firstName', e.target.value)}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.firstName
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-neutral-support focus:border-primary'
                  }`}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                />
                {errors.firstName && (
                  <p id="firstName-error" className="mt-1 text-sm text-red-500" role="alert">
                    {errors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-dark mb-2">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={!isLogin}
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    validateField('lastName', e.target.value);
                  }}
                  onBlur={(e) => validateField('lastName', e.target.value)}
                  className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors ${
                    errors.lastName
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-neutral-support focus:border-primary'
                  }`}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                />
                {errors.lastName && (
                  <p id="lastName-error" className="mt-1 text-sm text-red-500" role="alert">
                    {errors.lastName}
                  </p>
                )}
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                validateField('email', e.target.value);
              }}
              onBlur={(e) => validateField('email', e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-neutral-support focus:border-primary'
              }`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-500" role="alert">
                {errors.email}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validateField('password', e.target.value);
              }}
              onBlur={(e) => validateField('password', e.target.value)}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-neutral-support focus:border-primary'
              }`}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-500" role="alert">
                {errors.password}
              </p>
            )}
            {!isLogin && !errors.password && password.length > 0 && password.length < 6 && (
              <p className="mt-1 text-sm text-text-dark/60">
                Le mot de passe doit contenir au moins 6 caractères
              </p>
            )}
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isLoading}>
            {isLoading ? 'Chargement...' : isLogin ? 'Se connecter' : 'S\'inscrire'}
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

