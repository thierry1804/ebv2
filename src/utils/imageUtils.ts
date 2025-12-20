/**
 * Convertit une image en format WebP
 * @param file - Le fichier image à convertir
 * @param quality - Qualité de compression (0-1, défaut: 0.85)
 * @returns Promise<File> - Le fichier converti en WebP
 */
export async function convertToWebP(file: File, quality: number = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    // Vérifier si le fichier est déjà en WebP
    if (file.type === 'image/webp') {
      resolve(file);
      return;
    }

    // Vérifier si le fichier est une image
    if (!file.type.startsWith('image/')) {
      reject(new Error('Le fichier doit être une image'));
      return;
    }

    // Vérifier le support WebP
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) {
      // Fallback : retourner le fichier original si Canvas n'est pas supporté
      resolve(file);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        // Définir les dimensions du canvas
        canvas.width = img.width;
        canvas.height = img.height;

        // Dessiner l'image sur le canvas
        ctx.drawImage(img, 0, 0);

        // Convertir en WebP
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback si la conversion échoue
              resolve(file);
              return;
            }

            // Créer un nouveau fichier avec l'extension .webp
            const fileName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const webpFile = new File([blob], fileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(webpFile);
          },
          'image/webp',
          quality
        );
      } catch (error) {
        // En cas d'erreur, retourner le fichier original
        console.warn('Erreur lors de la conversion WebP, utilisation du fichier original:', error);
        resolve(file);
      }
    };

    img.onerror = () => {
      // En cas d'erreur de chargement, retourner le fichier original
      console.warn('Erreur lors du chargement de l\'image, utilisation du fichier original');
      resolve(file);
    };

    // Charger l'image
    img.src = URL.createObjectURL(file);
  });
}

