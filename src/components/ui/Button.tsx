import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2';
  
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent/80 focus:ring-accent focus-visible:outline-accent shadow-md hover:shadow-lg',
    secondary: 'bg-secondary text-white hover:bg-secondary/85 focus:ring-secondary focus-visible:outline-secondary shadow-md hover:shadow-lg',
    outline: 'border-2 border-secondary text-secondary hover:bg-secondary hover:text-white focus:ring-secondary focus-visible:outline-secondary font-semibold',
    ghost: 'text-text-dark hover:bg-primary/10 hover:text-secondary focus:ring-primary focus-visible:outline-primary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm min-h-[44px]',
    md: 'px-4 py-2 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}

