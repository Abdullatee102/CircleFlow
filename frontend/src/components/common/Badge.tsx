import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'blue' | 'yellow' | 'red' | 'gray' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'brand',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    brand: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    blue: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    gray: 'bg-slate-800 text-slate-300 border-slate-700',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

