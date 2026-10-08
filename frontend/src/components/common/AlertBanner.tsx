import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface AlertBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type = 'info',
  title,
  message,
  actionText,
  onAction,
  className = '',
}) => {
  const styles = {
    info: {
      bg: 'bg-sky-500/10 border-sky-500/30 text-sky-200',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />,
      btn: 'text-sky-400 hover:text-sky-300 underline',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />,
      btn: 'text-amber-400 hover:text-amber-300 underline',
    },
    error: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />,
      btn: 'text-rose-400 hover:text-rose-300 underline',
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />,
      btn: 'text-emerald-400 hover:text-emerald-300 underline',
    },
  };

  const current = styles[type];

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${current.bg} ${className}`}>
      {current.icon}
      <div className="flex-1">
        <h4 className="font-semibold text-slate-100">{title}</h4>
        {message && <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{message}</p>}
        {actionText && onAction && (
          <button onClick={onAction} className={`mt-2 text-xs font-semibold ${current.btn}`}>
            {actionText} →
          </button>
        )}
      </div>
    </div>
  );
};

