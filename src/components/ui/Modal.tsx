import { ReactNode, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBackdrop?: boolean;
  draggable?: boolean;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', showBackdrop = true, draggable = false }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Ne bloquer le scroll que si le backdrop est affiché
    if (isOpen && showBackdrop) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, showBackdrop]);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable || !title) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = modalRef.current?.getBoundingClientRect();
    if (rect) {
      // Si c'est le premier déplacement, initialiser la position au centre
      if (position === null) {
        setPosition({ x: 0, y: 0 });
      }
      // Enregistrer l'offset de la souris par rapport au coin supérieur gauche de la modal
      dragOffsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current || position === null) return;
      const rect = modalRef.current.getBoundingClientRect();
      const modalWidth = rect.width;
      const modalHeight = rect.height;
      
      // Calculer la position du coin supérieur gauche de la modal
      const newLeft = e.clientX - dragOffsetRef.current.x;
      const newTop = e.clientY - dragOffsetRef.current.y;
      
      // Calculer le décalage depuis le centre de l'écran
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const newX = newLeft - centerX + modalWidth / 2;
      const newY = newTop - centerY + modalHeight / 2;
      
      // Limiter la position pour que la modal reste visible
      const maxX = (window.innerWidth - modalWidth) / 2;
      const maxY = (window.innerHeight - modalHeight) / 2;
      
      const clampedX = Math.max(-maxX, Math.min(maxX, newX));
      const clampedY = Math.max(-maxY, Math.min(maxY, newY));
      
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4",
        showBackdrop && "bg-black/50 backdrop-blur-sm",
        !showBackdrop && "pointer-events-none"
      )}
      onClick={showBackdrop ? onClose : undefined}
    >
      <div
        ref={modalRef}
        className={cn(
          'bg-white rounded-lg shadow-xl w-full relative max-h-[90vh] overflow-y-auto pointer-events-auto',
          sizes[size],
          draggable && isDragging && 'cursor-move',
          draggable && position !== null && 'transition-none'
        )}
        style={draggable && position !== null ? { transform: `translate(${position.x}px, ${position.y}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div 
            className={cn(
              "flex items-center justify-between p-6 border-b border-neutral-support",
              draggable && "cursor-move select-none"
            )}
            onMouseDown={handleMouseDown}
          >
            <h2 className="text-xl font-heading font-semibold text-text-dark">{title}</h2>
            <button
              onClick={onClose}
              className="text-text-dark hover:text-secondary transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-dark hover:text-secondary transition-colors z-10"
          >
            <X size={24} />
          </button>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

