/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Token Hugging Face (exposé au bundle — migrer vers un backend pour la prod). */
  readonly VITE_HF_API_TOKEN?: string;
  /** Modèle vision optionnel, ex. Qwen/Qwen3-VL-8B-Instruct */
  readonly VITE_HF_VISION_MODEL?: string;
  /**
   * Origine pour charger `/api/images/…` en same-origin (repli si HF ne peut pas lire l’URL api.*).
   * Ex. https://eshopbyvalsue.mg si l’admin est sur un autre host.
   */
  readonly VITE_VISION_IMAGE_FETCH_ORIGIN?: string;
  /** Si true, l’analyse vision passe par la Edge Function `vision-product-analyze` (pas d’Apache/nginx boutique requis). */
  readonly VITE_VISION_ANALYZE_EDGE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
