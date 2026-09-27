import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface LeaveRoomButtonProps {
  onLeave: () => void;
  className?: string;
}

export const LeaveRoomButton: React.FC<LeaveRoomButtonProps> = ({ onLeave, className = '' }) => {
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
    onLeave();
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 active:bg-stone-600 text-stone-300 hover:text-white transition-all flex items-center space-x-1 text-xs font-semibold cursor-pointer select-none ${className}`}
      title="Выйти в главное меню"
    >
      <ArrowLeft className="w-4 h-4 text-amber-400" />
      <span className="hidden sm:inline">Выйти</span>
    </button>
  );
};
