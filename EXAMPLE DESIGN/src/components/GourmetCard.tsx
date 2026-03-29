import React from 'react';
import { cn } from '../lib/utils';

interface GourmetCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  key?: React.Key;
}

export function GourmetCard({ children, className, title, subtitle }: GourmetCardProps) {
  return (
    <div className={cn('bg-white rounded-[40px] p-8 shadow-2xl border-b-8 border-black/5 relative overflow-hidden', className)}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && <h3 className="text-2xl font-black text-gourmet-ink dark:text-dark-text tracking-tight">{title}</h3>}
          {subtitle && <p className="text-sm text-gourmet-ink dark:text-dark-text font-medium">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
