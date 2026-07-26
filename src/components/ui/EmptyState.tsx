'use client'
import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compactMode?: boolean;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compactMode = false
}: EmptyStateProps) {
  return (
    <div 
      className={clsx(
        "flex flex-col items-center justify-center text-center animate-fade-in-fast",
        compactMode ? "py-6 px-4" : "py-16 px-6",
        className
      )}
    >
      {icon && (
        <div 
          className={clsx(
            "rounded-full bg-jade-dim text-jade flex items-center justify-center mb-4",
            compactMode ? "w-12 h-12" : "w-16 h-16"
          )}
          style={{ backgroundColor: 'var(--color-jade-dim)', color: 'var(--color-jade)' }}
        >
          {icon}
        </div>
      )}
      
      <h3 className={clsx("font-semibold text-primary", compactMode ? "text-base" : "text-xl mb-2")}>
        {title}
      </h3>
      
      {description && (
        <p className={clsx("text-muted max-w-md", compactMode ? "text-xs mt-1" : "text-sm mb-6")}>
          {description}
        </p>
      )}
      
      {action && (
        <div className={clsx(compactMode ? "mt-4" : "mt-2")}>
          {action}
        </div>
      )}
    </div>
  );
}
