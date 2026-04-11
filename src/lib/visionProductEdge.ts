import { supabase } from './supabase';
import type { AnalyzeProductImageResult } from './hfProductVision';

/** Active l’analyse via Edge Function (recommandé si vous ne contrôlez pas Apache/nginx boutique). */
export function isVisionAnalyzeEdgeEnabled(): boolean {
  return import.meta.env.VITE_VISION_ANALYZE_EDGE === 'true';
}

export async function analyzeVisionProductImageEdge(params: {
  normalizedImageUrl: string;
  categoryNames: string[];
  model?: string;
}): Promise<AnalyzeProductImageResult> {
  const { data, error } = await supabase.functions.invoke<{
    parsed?: Record<string, unknown>;
    rawContent?: string;
    error?: string;
  }>('vision-product-analyze', {
    body: {
      imageUrl: params.normalizedImageUrl,
      categoryNames: params.categoryNames,
      model: params.model,
    },
  });

  if (error) {
    throw new Error(error.message || 'Fonction vision-product-analyze indisponible');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Réponse vide de la fonction vision');
  }
  if (typeof data.error === 'string' && data.error) {
    throw new Error(data.error);
  }
  if (!data.parsed || typeof data.parsed !== 'object') {
    throw new Error('Réponse sans champ parsed');
  }
  return {
    parsed: data.parsed,
    rawContent: typeof data.rawContent === 'string' ? data.rawContent : '',
  };
}
