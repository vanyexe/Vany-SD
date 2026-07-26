'use client'
import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  side?: 'right' | 'bottom';
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'right',
  width = 420,
  children,
  footer
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      setMounted(false);
      window.removeEventListener('resize', checkMobile);
    };
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
        if (drawerRef.current) {
          const focusableElements = drawerRef.current.querySelectorAll(
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

  const actualSide = isMobile ? 'bottom' : side;
  
  const drawerClasses = actualSide === 'bottom' 
    ? "drawer-panel-bottom fixed bottom-0 left-0 right-0 bg-surface text-primary rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up transition-transform duration-300"
    : "drawer-panel fixed top-0 bottom-0 right-0 bg-surface text-primary shadow-2xl flex flex-col h-full animate-slide-left transition-transform duration-300";

  return createPortal(
    <div 
      className="drawer-overlay fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in-fast"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "drawer-title" : undefined}
    >
      <div className="absolute inset-0" onClick={onClose} aria-label="Close backdrop" />
      
      <div 
        ref={drawerRef}
        className={drawerClasses}
        style={actualSide === 'right' ? { width: `${width}px`, maxWidth: '100vw' } : {}}
      >
        <div className="px-6 py-4 border-b border-border flex items-start justify-between shrink-0">
          <div>
            {title && <h2 id="drawer-title" className="text-lg font-semibold text-primary">{title}</h2>}
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon text-muted hover:text-primary transition-colors rounded-full p-1 -mr-2" 
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-border shrink-0 bg-surface">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
