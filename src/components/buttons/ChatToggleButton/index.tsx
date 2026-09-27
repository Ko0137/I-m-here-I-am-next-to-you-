import React from 'react';
import { MessageSquare } from 'lucide-react';

interface ChatToggleButtonProps {
  isOpen: boolean;
  unreadCount?: number;
  onToggle: () => void;
  className?: string;
}

export const ChatToggleButton: React.FC<ChatToggleButtonProps> = ({
  isOpen,
  unreadCount = 0,
  onToggle,
  className = ''
}) => {
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
    onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleAction}
      onTouchEnd={handleAction}
      className={`relative p-3 rounded-2xl transition-all cursor-pointer select-none ${
        isOpen
          ? 'bg-amber-500 text-stone-950 font-bold shadow-lg shadow-amber-500/20'
          : 'bg-stone-900/90 text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-800'
      } ${className}`}
      title="Чат комнаты"
    >
      <MessageSquare className="w-5 h-5" />
      {unreadCount > 0 && !isOpen && (
        <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center animate-bounce">
          {unreadCount}
        </span>
      )}
    </button>
  );
};
