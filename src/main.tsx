import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Attendre que le DOM soit complètement chargé avant d'initialiser React
// Cela résout l'erreur #306 qui se produit si le script s'exécute avant que le DOM soit prêt
function initApp() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('❌ Erreur: Élément racine #root introuvable dans le DOM');
    return;
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

// Si le DOM est déjà chargé, initialiser immédiatement
// Sinon, attendre l'événement DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
