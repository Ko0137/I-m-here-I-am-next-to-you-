import React, { useState } from 'react';
import { Users, UserCheck, Shield, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { User } from '../../../types';

interface RoomPresenceButtonProps {
  users: User[];
  currentUserId: string;
  className?: string;
}

export const RoomPresenceButton: React.FC<RoomPresenceButtonProps> = ({
  users,
  currentUserId,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const twa = (window as any).Telegram?.WebApp;
    if (twa?.HapticFeedback) {
      twa.HapticFeedback.impactOccurred('light');
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`} onMouseLeave={() => setIsOpen(false)}>
      <button
        type="button"
        onClick={toggle}
        onTouchEnd={toggle}
        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm cursor-pointer select-none"
        title="Список участников"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <Users className="w-3.5 h-3.5 text-amber-400" />
        <span>{users.length}</span>
        <span className="hidden sm:inline text-[11px] text-amber-400/80">
          {users.length === 1 ? 'участник' : 'участника'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>В комнате ({users.length})</span>
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">
              В ЭФИРЕ
            </span>
          </div>

          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {users.map((u) => {
              const isMe = u.id === currentUserId;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-stone-950/60 border border-stone-800/40 text-xs"
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-stone-950 font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                      {u.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-200 truncate">
                        {u.name} {isMe && <span className="text-amber-400/80 font-normal">(вы)</span>}
                      </p>
                      {u.isHost && (
                        <span className="text-[9px] text-amber-400 font-semibold flex items-center space-x-0.5">
                          <Shield className="w-2.5 h-2.5" />
                          <span>Создатель</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0 text-stone-400">
                    {u.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {u.isVideoOn ? (
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <VideoOff className="w-3.5 h-3.5 text-stone-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
