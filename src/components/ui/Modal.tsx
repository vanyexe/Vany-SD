'use client'
import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
  className?: string;
  showClose?: boolean;
  closeOnBackdropClick?: boolean;
  footerContent?: ReactNode;
}

export const ModalHeader = ({ title, description, showClose = true, onClose }: { title: string, description?: string, showClose?: boolean, onClose?: () => void }) => (
  <div className="px-6 py-4 border-b border-border flex items-start justify-between">
    <div>
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {description && <p className="text-sm text-muted mt-1">{description}</p>}
    </div>
    {showClose && onClose && (
      <button onClick={onClose} className="btn-icon text-muted hover:text-primary transition-colors rounded-full p-1" aria-label="Close modal">
        <X className="w-5 h-5" />
      </button>
    )}
  </div>
);

export const ModalBody = ({ children, className }: { children: ReactNode, className?: string }) => (
  <div className={clsx("p-6 overflow-y-auto", className)}>
    {children}
  </div>
);

export const ModalFooter = ({ children, className }: { children: ReactNode, className?: string }) => (
  <div className={clsx("px-6 py-4 border-t border-border flex items-center justify-end gap-3", className)}>
    {children}
  </div>
);

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
  showClose = true,
  closeOnBackdropClick = true,
  footerContent
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Focus trap
      setTimeout(() => {
        if (modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length) {
            (focusableElements[0] as HTMLElement).focus();
          }
        }
      }, 50);

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClasses = {
    sm: 'modal-sm max-w-sm',
    md: 'modal-md max-w-md',
    lg: 'modal-lg max-w-lg',
    xl: 'modal-xl max-w-xl',
    full: 'max-w-[95vw] h-[95vh]',
  };

  return createPortal(
    <div 
      className="modal-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-fast"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div 
        ref={modalRef}
        className={clsx(
          "modal-content bg-surface text-primary rounded-xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-scale-in w-full",
          sizeClasses[size],
          className
        )}
      >
        {(title || showClose) && (
          <ModalHeader 
            title={title || ''} 
            description={description} 
            showClose={showClose} 
            onClose={onClose} 
          />
        )}
        
        {children}

        {footerContent && (
          <ModalFooter>
            {footerContent}
          </ModalFooter>
        )}
      </div>
    </div>,
    document.body
  );
}
