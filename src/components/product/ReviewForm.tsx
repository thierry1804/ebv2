import { useState } from 'react';
import { Button } from '../ui/Button';
import { StarRating } from './StarRating';
import { useReviews } from '../../hooks/useReviews';
import toast from 'react-hot-toast';

interface ReviewFormProps {
  productId: string;
  onReviewSubmitted?: () => void;
}

export function ReviewForm({ productId, onReviewSubmitted }: ReviewFormProps) {
  const { submitReview, isLoading, error } = useReviews();
  const [userName, setUserName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client
    if (!userName.trim()) {
      toast.error('Veuillez saisir votre nom');
      return;
    }

    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    if (!comment.trim()) {
      toast.error('Veuillez saisir un commentaire');
      return;
    }

    if (comment.trim().length < 10) {
      toast.error('Le commentaire doit contenir au moins 10 caractères');
      return;
    }

    if (comment.trim().length > 1000) {
      toast.error('Le commentaire ne peut pas dépasser 1000 caractères');
      return;
    }

    // Soumettre l'avis
    const review = await submitReview(productId, userName, rating, comment);

    if (review) {
      toast.success('Votre avis a été publié avec succès !');
      // Réinitialiser le formulaire
      setUserName('');
      setRating(0);
      setComment('');
      // Appeler le callback pour rafraîchir la liste
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } else {
      toast.error(error || 'Erreur lors de la publication de votre avis');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm border border-neutral-support">
      <h3 className="text-xl font-heading font-bold text-text-dark mb-4">
        Donner votre avis
      </h3>

      <div className="space-y-4">
        {/* Champ nom */}
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-text-dark mb-2">
            Votre nom <span className="text-secondary">*</span>
          </label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-support rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
            placeholder="Votre nom"
            required
            maxLength={100}
          />
        </div>

        {/* Sélecteur de note */}
        <div>
          <label className="block text-sm font-medium text-text-dark mb-2">
            Votre note <span className="text-secondary">*</span>
          </label>
          <StarRating
            rating={rating}
            interactive={true}
            onRatingChange={setRating}
            size={24}
          />
          {rating > 0 && (
            <p className="text-sm text-text-dark/60 mt-1">
              {rating} étoile{rating > 1 ? 's' : ''} sélectionnée{rating > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Zone de commentaire */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-text-dark mb-2">
            Votre commentaire <span className="text-secondary">*</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            className="w-full px-4 py-2 border border-neutral-support rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
            placeholder="Partagez votre expérience avec ce produit..."
            required
            maxLength={1000}
          />
          <p className="text-xs text-text-dark/60 mt-1">
            {comment.length}/1000 caractères (minimum 10)
          </p>
        </div>

        {/* Bouton de soumission */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || rating === 0 || !userName.trim() || !comment.trim()}
          >
            {isLoading ? 'Publication...' : 'Publier mon avis'}
          </Button>
        </div>
      </div>
    </form>
  );
}

