import React from 'react';
import { LucideIcon } from 'lucide-react';

// --- Types ---
interface GaugeProps {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
}

interface ActionButtonProps {
  label: string;
  description: string;
  cost: number;
  icon: LucideIcon;
  color: string;
  disabled?: boolean;
  disabledReason?: string | boolean;
  onClick: () => void;
}

// --- Components ---

export const StatGauge: React.FC<GaugeProps> = ({ label, value, color, icon: Icon }) => {
  // Normalize value 0-100
  const percent = Math.min(100, Math.max(0, value));
  
  // Extract color classes for backgrounds
  const textColor = color.replace('bg-', 'text-');
  const iconBgLight = color.replace('bg-', 'bg-').replace('500', '100'); 
  const iconBgDark = color.replace('bg-', 'bg-').replace('500', '900');

  return (
    <div className="flex flex-col w-full mb-3 group">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${iconBgLight} dark:${iconBgDark} dark:bg-opacity-40 transition-colors`}>
             <Icon size={14} className={textColor} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200 text-xs tracking-wide">{label}</span>
        </div>
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 font-bold">{Math.round(percent)}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-200 dark:ring-slate-700/50">
        <div 
          className={`h-full transition-all duration-700 ease-out rounded-full ${color} shadow-sm relative overflow-hidden`} 
          style={{ width: `${percent}%` }}
        >
          {/* Shine effect */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20"></div>
        </div>
      </div>
    </div>
  );
};

export const ActionCard: React.FC<ActionButtonProps> = ({ 
  label, 
  description, 
  cost, 
  icon: Icon, 
  color, 
  disabled, 
  disabledReason, 
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group flex items-start gap-4 p-4 w-full rounded-2xl border transition-all duration-200 text-left
        ${disabled 
          ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-60 cursor-not-allowed' 
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-md active:scale-[0.99]'}
      `}
    >
      <div className={`p-2.5 rounded-xl shadow-sm ${disabled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800 group-hover:bg-orange-50 dark:group-hover:bg-slate-700'} shrink-0 transition-colors`}>
        <Icon size={20} className={disabled ? 'text-slate-400 dark:text-slate-600' : color} strokeWidth={2} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <h4 className={`font-bold text-sm truncate pr-2 ${disabled ? 'text-slate-500 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>{label}</h4>
          <span className="text-[10px] font-mono uppercase font-bold text-primary bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded border border-orange-100 dark:border-orange-900/30 whitespace-nowrap">-{cost} Énergie</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{description}</p>
        
        {disabled && typeof disabledReason === 'string' && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2 font-semibold flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            {disabledReason}
          </p>
        )}
      </div>
    </button>
  );
};

export const LogEntry: React.FC<{ text: string; type: 'info' | 'success' | 'warning' | 'danger'; day: number }> = ({ text, type, day }) => {
  const styles = {
    info: 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-l-slate-400 dark:border-l-slate-500',
    success: 'bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 border-l-green-500',
    warning: 'bg-orange-50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400 border-l-orange-500',
    danger: 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border-l-red-500',
  };

  return (
    <div className={`pl-3 py-2 pr-2 mb-2 border-l-4 rounded-r-lg text-sm font-medium ${styles[type]} animate-in slide-in-from-left-2 duration-300 flex gap-2 items-start`}>
      <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mt-0.5 tracking-wider shrink-0">J{day}</span>
      <span className="leading-snug">{text}</span>
    </div>
  );
};

export const Modal: React.FC<{ children: React.ReactNode; title: string; showConfetti?: boolean }> = ({ children, title, showConfetti }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4">
      {showConfetti && (
        <div className="confetti-container">
           {[...Array(50)].map((_, i) => (
             <div 
               key={i} 
               className="confetti"
               style={{
                 left: `${Math.random() * 100}%`,
                 backgroundColor: ['#fd681a', '#3b82f6', '#10b981', '#facc15'][Math.floor(Math.random() * 4)],
                 animationDuration: `${2 + Math.random() * 3}s`,
                 animationDelay: `${Math.random() * 2}s`
               }}
             />
           ))}
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative z-50">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 text-center tracking-tight">{title}</h2>
        {children}
      </div>
    </div>
  );
};