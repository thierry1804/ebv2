import { useEffect, useState } from 'react';
import { Review } from '../../types';
import { useReviews } from '../../hooks/useReviews';
import { StarRating } from './StarRating';

interface ReviewListProps {
  productId: string;
  refreshKey?: number;
}

export function ReviewList({ productId, refreshKey }: ReviewListProps) {
  const { getReviews, isLoading, error } = useReviews();
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = async () => {
    const loadedReviews = await getReviews(productId);
    setReviews(loadedReviews);
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, refreshKey]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-text-dark/60">Chargement des avis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Erreur lors du chargement des avis : {error}</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-dark/60">Aucun avis pour ce produit pour le moment.</p>
        <p className="text-sm text-text-dark/40 mt-2">Soyez le premier à donner votre avis !</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-heading font-semibold text-text-dark">
          {reviews.length} avis{reviews.length > 1 ? '' : ''}
        </h4>
      </div>

      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white rounded-lg p-6 shadow-sm border border-neutral-support"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {review.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-text-dark">{review.userName}</p>
                  <p className="text-sm text-text-dark/60">{formatDate(review.createdAt)}</p>
                </div>
              </div>
            </div>
            <StarRating rating={review.rating} size={18} />
          </div>

          <p className="text-text-dark/80 leading-relaxed whitespace-pre-wrap">
            {review.comment}
          </p>

          {review.images && review.images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {review.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Photo ${index + 1} de ${review.userName}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

