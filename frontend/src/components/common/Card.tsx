import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-slate-700/90 hover:bg-slate-900/80' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

