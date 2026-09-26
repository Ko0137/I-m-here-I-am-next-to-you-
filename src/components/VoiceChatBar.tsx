import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Volume2, Users } from 'lucide-react';
import { User } from '../types';

interface VoiceChatBarProps {
  users: User[];
  currentUser: User | null;
  onToggleMute: (isMuted: boolean) => void;
  onToggleVideo: (isVideoOn: boolean) => void;
}

export const VoiceChatBar: React.FC<VoiceChatBarProps> = ({ users, currentUser, onToggleMute, onToggleVideo }) => {
  const [isMuted, setIsMuted] = useState(currentUser?.isMuted || false);
  const [isVideoOn, setIsVideoOn] = useState(currentUser?.isVideoOn || false);

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    onToggleMute(next);
  };

  const handleVideoToggle = () => {
    const next = !isVideoOn;
    setIsVideoOn(next);
    onToggleVideo(next);
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-lg">
      {/* Participants avatars */}
      <div className="flex items-center space-x-3 overflow-x-auto py-1">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium mr-1">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>{users.length}</span>
        </div>

        {users.map((u) => (
          <div key={u.id} className="relative flex items-center group">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                u.isSpeaking
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {u.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {u.isMuted && (
              <span className="absolute -bottom-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full text-[9px] shadow">
                <MicOff className="w-2.5 h-2.5" />
              </span>
            )}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-950 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {u.name} {u.id === currentUser?.id ? '(You)' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Control buttons */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleMuteToggle}
          className={`p-2.5 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-medium ${
            isMuted
              ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span className="hidden md:inline">{isMuted ? 'Muted' : 'Mic On'}</span>
        </button>

        <button
          onClick={handleVideoToggle}
          className={`p-2.5 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-medium ${
            isVideoOn
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
          }`}
          title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-slate-400" />}
          <span className="hidden md:inline">{isVideoOn ? 'Cam On' : 'Camera'}</span>
        </button>
      </div>
    </div>
  );
};
