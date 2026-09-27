import React, { useState } from 'react';
import { Users, Film, ArrowLeft, UserCheck, Shield, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { User, RoomState } from '../types';

interface HeaderProps {
  user: User | null;
  room: RoomState | null;
  onLeaveRoom?: () => void;
  onOpenSearch?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, room, onLeaveRoom, onOpenSearch }) => {
  const isTg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData;
  const [showPresenceList, setShowPresenceList] = useState(false);

  const activeUsers = room?.users || [];
  const participantCount = activeUsers.length;

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center space-x-3">
        {room ? (
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1 text-xs font-medium cursor-pointer"
            title="Покинуть комнату"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Выйти</span>
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
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            {room ? (
              <span className="text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Комната: {room.roomId}</span>
              </span>
            ) : (
              <span>Совместный просмотр и голосовой чат</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {room && (
          <>
            {/* Room Presence Indicator with hover & click popover */}
            <div 
              className="relative"
              onMouseEnter={() => setShowPresenceList(true)}
              onMouseLeave={() => setShowPresenceList(false)}
            >
              <button
                type="button"
                onClick={() => setShowPresenceList(!showPresenceList)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
                title="Участники комнаты"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{participantCount}</span>
                <span className="hidden sm:inline text-[11px] text-emerald-400/80">
                  {participantCount === 1 ? 'в сети' : 'онлайн'}
                </span>
              </button>

              {/* Hover & Mobile Dropdown Details */}
              {showPresenceList && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Участники ({participantCount})</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                      LIVE
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {activeUsers.map((u) => {
                      const isMe = u.id === user?.id;
                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors text-xs"
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                              {u.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-200 truncate">
                                {u.name} {isMe && <span className="text-slate-400 font-normal">(вы)</span>}
                              </p>
                              {u.isHost && (
                                <span className="text-[9px] text-amber-400 font-semibold flex items-center space-x-0.5">
                                  <Shield className="w-2.5 h-2.5" />
                                  <span>Создатель</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 text-slate-400">
                            {u.isMuted ? (
                              <MicOff className="w-3 h-3 text-red-400" />
                            ) : (
                              <Mic className="w-3 h-3 text-emerald-400" />
                            )}
                            {u.isVideoOn ? (
                              <Video className="w-3 h-3 text-sky-400" />
                            ) : (
                              <VideoOff className="w-3 h-3 text-slate-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                const twa = (window as any).Telegram?.WebApp;
                const inviteUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '?room=' + room.roomId)}&text=${encodeURIComponent('Присоединяйся к совместному просмотру в комнате ' + room.roomId + '!')}`;
                
                if (twa?.openTelegramLink) {
                  twa.openTelegramLink(inviteUrl);
                } else if (navigator.clipboard) {
                  navigator.clipboard.writeText(room.roomId);
                }
                if (twa?.HapticFeedback) {
                  twa.HapticFeedback.notificationOccurred('success');
                }
              }}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
              title="Скопировать ссылку приглашения"
            >
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
              <span className="hidden sm:inline">Пригласить</span>
            </button>

            <button
              onClick={onOpenSearch}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сменить фильм</span>
            </button>
          </>
        )}

        <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/60 px-2.5 sm:px-3 py-1.5 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-300 font-bold flex items-center justify-center text-xs">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <span className="text-xs font-medium text-slate-200 max-w-[80px] sm:max-w-[100px] truncate">
            {user?.name || 'Гость'}
          </span>
        </div>
      </div>
    </header>
  );
};
