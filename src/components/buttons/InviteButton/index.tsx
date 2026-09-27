import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface InviteButtonProps {
  roomId: string;
  className?: string;
}

export const InviteButton: React.FC<InviteButtonProps> = ({ roomId, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleInvite = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const twa = (window as any).Telegram?.WebApp;
    if (twa?.HapticFeedback) {
      twa.HapticFeedback.notificationOccurred('success');
    }

    const shareUrl = `${window.location.origin}?room=${roomId}`;
    const shareText = `Присоединяйся к совместному просмотру фильма в комнате ${roomId}!`;

    if (twa?.openTelegramLink) {
      twa.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInvite}
      onTouchEnd={handleInvite}
      className={`px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-700 text-stone-200 font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer select-none ${className}`}
      title="Поделиться ссылкой на комнату"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">Скопировано!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Позвать</span>
        </>
      )}
    </button>
  );
};
