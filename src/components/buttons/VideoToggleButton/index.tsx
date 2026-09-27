import React from 'react';
import { Video, VideoOff } from 'lucide-react';

interface VideoToggleButtonProps {
  isVideoOn: boolean;
  onToggle: (videoOn: boolean) => void;
  className?: string;
}

export const VideoToggleButton: React.FC<VideoToggleButtonProps> = ({
  isVideoOn,
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
    onToggle(!isVideoOn);
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`p-3 rounded-2xl transition-all cursor-pointer select-none flex items-center justify-center ${
        !isVideoOn
          ? 'bg-stone-900 text-stone-400 border border-stone-800 hover:bg-stone-800 hover:text-white'
          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
      } ${className}`}
      title={isVideoOn ? 'Выключить камеру' : 'Включить камеру'}
    >
      {isVideoOn ? <Video className="w-5 h-5 text-amber-400" /> : <VideoOff className="w-5 h-5" />}
    </button>
  );
};
