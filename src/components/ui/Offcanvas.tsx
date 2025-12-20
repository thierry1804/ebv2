import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface OffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: 'left' | 'right';
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Offcanvas({
  isOpen,
  onClose,
  title,
  children,
  footer,
  position = 'right',
  width = 'lg',
}: OffcanvasProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const widths = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[600px]',
    xl: 'w-[800px]',
  };

  const positions = {
    left: 'left-0',
    right: 'right-0',
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Offcanvas */}
      <div
        className={cn(
          'fixed top-0 h-full z-50 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col',
          positions[position],
          widths[width],
          'translate-x-0'
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <h2 className="text-xl font-heading font-semibold text-text-dark">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-dark hover:text-secondary transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        )}
        
        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        
        {/* Footer - fixed at bottom */}
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

