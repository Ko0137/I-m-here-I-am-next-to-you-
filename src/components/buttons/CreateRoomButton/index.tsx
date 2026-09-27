import React from 'react';
import { Plus, Sparkles } from 'lucide-react';

interface CreateRoomButtonProps {
  onClick: (e?: React.SyntheticEvent) => void;
  className?: string;
  label?: string;
  isCompact?: boolean;
}

export const CreateRoomButton: React.FC<CreateRoomButtonProps> = ({
  onClick,
  className = '',
  label = 'Создать комнату',
  isCompact = false
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
    onClick(e);
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-[1px] font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer select-none ${className}`}
    >
      <div className={`flex items-center justify-center space-x-2 rounded-2xl bg-stone-950/90 group-hover:bg-transparent transition-colors text-white ${isCompact ? 'px-4 py-2 text-xs' : 'px-6 py-3.5 text-sm md:text-base'}`}>
        <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
          <Plus className="h-3.5 w-3.5" />
        </div>
        <span className="tracking-wide">{label}</span>
        <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse opacity-80" />
      </div>
    </button>
  );
};
