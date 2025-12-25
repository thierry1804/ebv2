import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  min?: number;
  max?: number;
  stockStatus?: 'in_stock' | 'out_of_stock';
}

export function QuantitySelector({
  quantity,
  onIncrease,
  onDecrease,
  min = 1,
  max = 99,
  stockStatus,
}: QuantitySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-dark mb-2">
        Quantité
        {stockStatus && (
          <span className={stockStatus === 'in_stock' ? 'text-green-600' : 'text-red-600'}>
            {' '}({stockStatus === 'in_stock' ? 'En stock' : 'Rupture de stock'})
          </span>
        )}
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={onDecrease}
          disabled={quantity <= min}
          className="p-2 rounded-lg border-2 border-neutral-support text-text-dark hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Minus size={20} />
        </button>
        <span className="text-lg font-semibold text-text-dark w-12 text-center">{quantity}</span>
        <button
          onClick={onIncrease}
          disabled={quantity >= max}
          className="p-2 rounded-lg border-2 border-neutral-support text-text-dark hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

