import React, { useState } from 'react';
import { ArrowRight, KeyRound } from 'lucide-react';

interface JoinRoomButtonProps {
  onJoin: (roomId: string) => void;
  className?: string;
}

export const JoinRoomButton: React.FC<JoinRoomButtonProps> = ({ onJoin, className = '' }) => {
  const [roomIdInput, setRoomIdInput] = useState('');

  const triggerHaptic = () => {
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        twa.HapticFeedback.impactOccurred('medium');
      }
    } catch (e) {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!roomIdInput.trim()) return;
    triggerHaptic();
    onJoin(roomIdInput.trim().toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className={`flex items-center space-x-2 ${className}`}>
      <div className="relative flex-1">
        <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
        <input
          type="text"
          value={roomIdInput}
          onChange={(e) => setRoomIdInput(e.target.value)}
          placeholder="КОД КОМНАТЫ"
          className="w-full bg-stone-900/90 border border-stone-800 rounded-2xl pl-10 pr-3 py-3 text-sm text-stone-100 placeholder-stone-500 font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500/80 transition-all"
        />
      </div>
      <button
        type="submit"
        onClick={handleSubmit}
        onTouchEnd={handleSubmit}
        className="px-5 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-700 text-stone-200 hover:text-white font-semibold text-sm flex items-center space-x-1.5 transition-all shadow-md cursor-pointer select-none"
      >
        <span>Войти</span>
        <ArrowRight className="w-4 h-4 text-amber-400" />
      </button>
    </form>
  );
};
