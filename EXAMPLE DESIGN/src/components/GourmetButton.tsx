import React from 'react';
import { cn } from '../lib/utils';

interface GourmetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'cream';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export function GourmetButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className, 
  ...props 
}: GourmetButtonProps) {
  const variants = {
    primary: 'bg-gourmet-orange text-gourmet-ink dark:text-dark-text border-black/20',
    secondary: 'bg-gourmet-green text-gourmet-ink dark:text-dark-text border-black/20',
    danger: 'bg-red-500 text-gourmet-ink dark:text-dark-text border-black/20',
    success: 'bg-green-500 text-gourmet-ink dark:text-dark-text border-black/20',
    cream: 'bg-gourmet-cream text-gourmet-ink dark:text-dark-text border-black/10',
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
    icon: 'w-12 h-12 flex items-center justify-center p-0',
  };

  return (
    <button
      className={cn(
        'rounded-full font-black uppercase tracking-widest border-b-4 transition-all active:translate-y-1 active:border-b-0 shadow-lg hover:scale-105 flex items-center gap-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
