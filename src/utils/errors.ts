/**
 * Détection hors-ligne / erreurs réseau et messages utilisateur cohérents.
 */

export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine === false;
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (isOffline()) return true;
  if (error == null) return false;

  const err = error as { name?: string; message?: string; cause?: unknown };
  const name = err.name ?? '';
  const msg = String(err.message ?? '').toLowerCase();

  if (name === 'TypeError' || name === 'NetworkError' || name === 'AbortError') {
    if (
      msg.includes('fetch') ||
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed')
    ) {
      return true;
    }
  }

  if (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg === 'network error' ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout')
  ) {
    return true;
  }

  if (err.cause) {
    return isLikelyNetworkError(err.cause);
  }

  return false;
}

export function extractErrorMessage(error: unknown): string | null {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (typeof error === 'object' && error !== null) {
    const e = error as {
      message?: string;
      details?: string;
      hint?: string;
    };
    const parts = [e.message, e.details, e.hint].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0
    );
    if (parts.length > 0) return parts.join(' — ');
  }
  return null;
}

/**
 * Message lisible : priorité connexion réseau, puis message API/PostgREST, sinon repli.
 */
export function formatAppError(error: unknown, fallback: string): string {
  if (isOffline()) {
    return 'Vous semblez hors ligne. Vérifiez votre connexion internet.';
  }
  if (isLikelyNetworkError(error)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez.';
  }
  const extracted = extractErrorMessage(error);
  if (extracted) return extracted;
  return fallback;
}

/** Rejette si `promise` ne se termine pas dans les `ms` (évite un bouton bloqué indéfiniment). */
export function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
