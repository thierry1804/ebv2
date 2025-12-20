import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks - bibliothèques externes
          if (id.includes('node_modules')) {
            // React et toutes ses dépendances dans le même chunk
            // Cela garantit que React est toujours disponible avant les autres vendors
            if (
              id.includes('react') || 
              id.includes('react-dom') || 
              id.includes('react-router') ||
              id.includes('framer-motion') || // Dépend de React
              id.includes('react-hot-toast')   // Dépend de React
            ) {
              return 'vendor-react';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Autres vendors (lucide-react, etc. - pas de dépendance React)
            return 'vendor';
          }
          
          // Admin chunks - toutes les pages admin
          if (id.includes('/pages/admin/')) {
            return 'admin';
          }
          
          // Public pages chunk
          if (id.includes('/pages/')) {
            return 'pages';
          }
          
          // Components chunk
          if (id.includes('/components/')) {
            return 'components';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Augmenter la limite à 1MB pour éviter les warnings
    // S'assurer que les chemins sont relatifs pour fonctionner partout
    assetsDir: 'assets',
  },
});
