'use client'
import React from 'react';
import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const BaseSkeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={clsx('skeleton bg-surface-hover animate-pulse rounded-md', className)}
      {...props}
    />
  );
};

const SkeletonText = ({ lines = 1, className }: { lines?: number, className?: string }) => {
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <BaseSkeleton
          key={i}
          className={clsx(
            "h-4 w-full",
            i === lines - 1 && lines > 1 ? "max-w-[80%]" : "",
            i === lines - 2 && lines > 2 ? "max-w-[90%]" : ""
          )}
        />
      ))}
    </div>
  );
};

const SkeletonAvatar = ({ size = 40, className }: { size?: number, className?: string }) => {
  return (
    <BaseSkeleton
      className={clsx("rounded-full", className)}
      style={{ width: size, height: size }}
    />
  );
};

const SkeletonCard = ({ className }: { className?: string }) => {
  return (
    <div className={clsx("card p-4 flex flex-col gap-4 border border-border rounded-xl", className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={48} />
        <div className="flex flex-col gap-2 flex-1">
          <BaseSkeleton className="h-4 w-1/3" />
          <BaseSkeleton className="h-3 w-1/4" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
};

const SkeletonRow = ({ className }: { className?: string }) => {
  return (
    <div className={clsx("flex items-center gap-4 py-2", className)}>
      <SkeletonAvatar size={32} />
      <div className="flex flex-col gap-2 flex-1">
        <BaseSkeleton className="h-4 w-1/2" />
        <BaseSkeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
};

const SkeletonButton = ({ className }: { className?: string }) => {
  return <BaseSkeleton className={clsx("h-10 w-24 rounded-lg", className)} />;
};

const SkeletonStat = ({ className }: { className?: string }) => {
  return (
    <div className={clsx("card p-4 border border-border rounded-xl flex flex-col gap-2", className)}>
      <BaseSkeleton className="h-4 w-20" />
      <BaseSkeleton className="h-8 w-16 mt-2" />
    </div>
  );
};

export const Skeleton = Object.assign(BaseSkeleton, {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
  Row: SkeletonRow,
  Button: SkeletonButton,
  Stat: SkeletonStat,
});

export default Skeleton;
