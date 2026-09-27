import React from 'react';
import { User, RoomState } from '../types';
import { LeaveRoomButton } from './buttons/LeaveRoomButton';
import { ChangeMovieButton } from './buttons/ChangeMovieButton';
import { InviteButton } from './buttons/InviteButton';
import { RoomPresenceButton } from './buttons/RoomPresenceButton';
import { BrowserToggleButton } from './buttons/BrowserToggleButton';

interface HeaderProps {
  user: User;
  room: RoomState | null;
  onLeaveRoom: () => void;
  onOpenSearch: () => void;
  isBrowserActive?: boolean;
  onToggleBrowser?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  room,
  onLeaveRoom,
  onOpenSearch,
  isBrowserActive = false,
  onToggleBrowser
}) => {
  const isTg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;

  return (
    <header className="h-16 border-b border-stone-800/80 bg-stone-950/95 backdrop-blur-xl px-4 md:px-6 flex items-center justify-between shrink-0 z-40 select-none">
      {/* Brand & Left Actions */}
      <div className="flex items-center space-x-3">
        {room ? (
          <LeaveRoomButton onLeave={onLeaveRoom} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-stone-950 font-black text-xl shadow-lg shadow-amber-500/20">
            🎬
          </div>
        )}

        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm md:text-base tracking-tight text-stone-100">
              Я рядом
            </span>
            {isTg ? (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                Telegram TMA
              </span>
            ) : (
              <span className="rounded-md bg-stone-800 px-1.5 py-0.5 text-[10px] font-medium text-stone-400">
                Web
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 font-medium">
            {room ? (
              <span className="text-amber-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>Комната: #{room.roomId}</span>
              </span>
            ) : (
              'Синхронный кинозал, браузер и голосовой чат'
            )}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {room && (
          <>
            {onToggleBrowser && (
              <BrowserToggleButton
                isActive={isBrowserActive}
                onToggle={onToggleBrowser}
              />
            )}
            <RoomPresenceButton users={room.users} currentUserId={user.id} />
            <InviteButton roomId={room.roomId} />
            <ChangeMovieButton onClick={onOpenSearch} />
          </>
        )}

        {/* User Badge */}
        <div className="flex items-center space-x-2 rounded-2xl bg-stone-900 border border-stone-800/80 px-2.5 py-1.5 shadow-sm">
          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-[10px] font-black text-stone-950 uppercase shadow-inner">
            {user.name?.[0] || 'U'}
          </div>
          <span className="max-w-[80px] md:max-w-[120px] truncate text-xs font-semibold text-stone-200">
            {user.name}
          </span>
        </div>
      </div>
    </header>
  );
};
