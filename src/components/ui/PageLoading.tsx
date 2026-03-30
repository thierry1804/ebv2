import { LoadingSpinner } from './Loading';

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <LoadingSpinner size="md" />
    </div>
  );
}

