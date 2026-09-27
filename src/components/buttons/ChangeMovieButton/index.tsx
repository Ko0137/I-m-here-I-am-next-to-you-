import React from 'react';
import { Film } from 'lucide-react';

interface ChangeMovieButtonProps {
  onClick: () => void;
  className?: string;
}

export const ChangeMovieButton: React.FC<ChangeMovieButtonProps> = ({ onClick, className = '' }) => {
  const triggerHaptic = () => {
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        twa.HapticFeedback.impactOccurred('light');
      }
    } catch (e) {}
  };

  const handleAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-amber-500/10 cursor-pointer select-none ${className}`}
      title="Выбрать другой фильм или сериал"
    >
      <Film className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Сменить фильм</span>
    </button>
  );
};
