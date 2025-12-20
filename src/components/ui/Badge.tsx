import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-neutral-support text-text-dark',
    primary: 'bg-primary text-white',
    secondary: 'bg-secondary text-white',
    accent: 'bg-accent text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full text-xs font-medium px-2 py-0.5 min-w-[20px]',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

