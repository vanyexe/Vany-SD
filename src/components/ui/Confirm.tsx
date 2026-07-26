'use client'
import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter } from './Modal';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { useToast } from '../providers/ToastProvider';

interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export default function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading: externalLoading
}: ConfirmProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const toast = useToast();
  
  const isLoading = externalLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Action failed', 'An error occurred while confirming this action.');
    } finally {
      setInternalLoading(false);
    }
  };

  const Icon = variant === 'info' ? Info : AlertTriangle;
  const iconColorClass = 
    variant === 'danger' ? 'text-brick' : 
    variant === 'warning' ? 'text-gold' : 
    'text-jade';

  const buttonClass = 
    variant === 'danger' ? 'btn btn-danger' : 
    variant === 'warning' ? 'btn bg-gold text-surface hover:bg-gold/90' : 
    'btn btn-jade';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      showClose={!isLoading}
      closeOnBackdropClick={!isLoading}
    >
      <ModalBody className="pt-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={clsx('p-3 rounded-full bg-surface-raised', iconColorClass)}>
            <Icon className="w-8 h-8" style={{ 
              color: variant === 'danger' ? 'var(--color-brick)' : variant === 'warning' ? 'var(--color-gold)' : 'var(--color-jade)'
            }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-primary mb-2">{title}</h3>
            <p className="text-sm text-muted">{message}</p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="flex-col sm:flex-row gap-2 pb-6 px-6">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="btn btn-ghost w-full sm:w-auto order-2 sm:order-1"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={clsx('w-full sm:w-auto order-1 sm:order-2', buttonClass)}
          style={{
            backgroundColor: variant === 'warning' ? 'var(--color-gold)' : undefined,
            color: variant === 'warning' ? 'var(--color-ink)' : undefined
          }}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}
