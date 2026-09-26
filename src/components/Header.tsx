import React from 'react';
import { Users, Film, Wifi, Shield, ArrowLeft } from 'lucide-react';
import { User, RoomState } from '../types';

interface HeaderProps {
  user: User | null;
  room: RoomState | null;
  onLeaveRoom?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, room, onLeaveRoom, onOpenSearch }) => {
  const isTg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        {room ? (
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1 text-xs font-medium"
            title="Leave Room"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
            🎬
          </div>
        )}
        <div>
          <h1 className="font-bold text-sm md:text-base tracking-wide flex items-center space-x-1.5">
            <span>Я рядом</span>
            {isTg && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-md font-normal">Telegram TMA</span>}
          </h1>
          <p className="text-xs text-slate-400 flex items-center space-x-1">
            {room ? (
              <span className="text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Room: {room.roomId}</span>
              </span>
            ) : (
              <span>Co-Watching & Voice Chat</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {room && (
          <>
            <button
              onClick={() => {
                const twa = (window as any).Telegram?.WebApp;
                const inviteUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '?room=' + room.roomId)}&text=${encodeURIComponent('Присоединяйся к совместному просмотру в комнате ' + room.roomId + '!')}`;
                
                if (twa?.openTelegramLink) {
                  twa.openTelegramLink(inviteUrl);
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(room.roomId);
                  alert('Код комнаты скопирован в буфер обмена: ' + room.roomId);
                }
                if (twa?.HapticFeedback) {
                  twa.HapticFeedback.notificationOccurred('success');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm"
              title="Скопировать ссылку приглашения"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
              <span className="hidden sm:inline">Пригласить</span>
            </button>

            <button
              onClick={onOpenSearch}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change Movie</span>
            </button>
          </>
        )}

        <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 font-bold flex items-center justify-center text-xs">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-xs font-medium text-slate-200 max-w-[90px] truncate">
            {user?.name || 'Guest'}
          </span>
        </div>
      </div>
    </header>
  );
};
