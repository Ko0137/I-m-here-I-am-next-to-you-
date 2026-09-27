import React from 'react';
import { Globe } from 'lucide-react';

interface BrowserToggleButtonProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

export const BrowserToggleButton: React.FC<BrowserToggleButtonProps> = ({
  isActive,
  onToggle,
  className = ''
}) => {
  const triggerHaptic = () => {
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        twa.HapticFeedback.impactOccurred('medium');
      }
    } catch (e) {}
  };

  const handleAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer select-none ${
        isActive
          ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-amber-500/20'
          : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-amber-500/30'
      } ${className}`}
      title="Открыть встроенный браузер для поиска любых сайтов"
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{isActive ? 'Закрыть браузер' : 'Браузер сайтов'}</span>
    </button>
  );
};
