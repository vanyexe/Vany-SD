'use client'
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
  action?: ToastAction;
  isRemoving?: boolean;
}

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  success: (message: string, options?: ToastOptions | string) => void;
  error:   (message: string, options?: ToastOptions | string) => void;
  warning: (message: string, options?: ToastOptions | string) => void;
  info:    (message: string, options?: ToastOptions | string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 6000;
const ANIMATION_DURATION = 300;

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isRemoving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), ANIMATION_DURATION);
  }, []);

  const addToast = useCallback((type: ToastType, message: string, options?: ToastOptions | string) => {
    const id = Math.random().toString(36).substring(2, 9);
    let description: string | undefined;
    let duration: number | undefined;
    let action: ToastAction | undefined;

    if (typeof options === 'string') {
      description = options;
    } else if (options) {
      description = options.description;
      duration = options.duration;
      action = options.action;
    }

    const toastDuration = duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION);

    setToasts(prev => {
      const next = [...prev, { id, type, message, description, duration: toastDuration, action }];
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
    });

    if (toastDuration > 0) {
      setTimeout(() => dismiss(id), toastDuration);
    }
  }, [dismiss]);

  const value: ToastContextValue = {
    success: (msg, opts) => addToast('success', msg, opts),
    error:   (msg, opts) => addToast('error',   msg, opts),
    warning: (msg, opts) => addToast('warning', msg, opts),
    info:    (msg, opts) => addToast('info',    msg, opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, dismiss }: { toasts: ToastMessage[]; dismiss: (id: string) => void }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0 sm:w-80">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>,
    document.body
  );
};

const Toast = ({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) => {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-jade)' }} />,
    error:   <XCircle      className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brick)' }} />,
    warning: <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: 'var(--color-gold)' }} />,
    info:    <Info          className="w-4 h-4 shrink-0" style={{ color: 'var(--color-secondary)' }} />,
  };

  const accentColor =
    toast.type === 'success' ? 'var(--color-jade)' :
    toast.type === 'error'   ? 'var(--color-brick)' :
    toast.type === 'warning' ? 'var(--color-gold)' :
    'var(--color-secondary)';

  return (
    <div
      className={clsx(
        'pointer-events-auto bg-surface border border-border rounded-xl shadow-xl',
        'flex flex-col gap-2 p-4 relative overflow-hidden transition-all duration-300',
        toast.isRemoving ? 'opacity-0 scale-95 translate-x-4' : 'animate-scale-in'
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[toast.type]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary leading-snug">{toast.message}</p>
          {toast.description && (
            <p className="text-xs text-muted mt-0.5 leading-relaxed">{toast.description}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-muted hover:text-primary transition-colors -mt-0.5 -mr-1"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {toast.action && (
        <div className="flex justify-end">
          <button
            onClick={() => { toast.action!.onClick(); onDismiss(); }}
            className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
            style={{ color: accentColor, background: `${accentColor}15` }}
          >
            {toast.action.label}
          </button>
        </div>
      )}
    </div>
  );
};
