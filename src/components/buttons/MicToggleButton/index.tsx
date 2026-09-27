import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicToggleButtonProps {
  isMuted: boolean;
  onToggle: (muted: boolean) => void;
  className?: string;
}

export const MicToggleButton: React.FC<MicToggleButtonProps> = ({
  isMuted,
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
    onToggle(!isMuted);
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`p-3 rounded-2xl transition-all cursor-pointer select-none flex items-center justify-center ${
        isMuted
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
      } ${className}`}
      title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
    >
      {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 animate-pulse" />}
    </button>
  );
};
