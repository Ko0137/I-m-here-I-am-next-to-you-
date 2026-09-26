import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, MessageSquare, Film } from 'lucide-react';
import { Movie, RoomState, User } from '../types';
import { VoiceChatBar } from './VoiceChatBar';

interface VideoPlayerProps {
  room: RoomState;
  currentUser: User | null;
  socket: any;
  onOpenChat: () => void;
  onOpenSearch: () => void;
  onToggleMute: (isMuted: boolean) => void;
  onToggleVideo: (isVideoOn: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  room,
  currentUser,
  socket,
  onOpenChat,
  onOpenSearch,
  onToggleMute,
  onToggleVideo
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(room.isPlaying);
  const [currentTime, setCurrentTime] = useState(room.currentTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const movie = room.movie;

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie?.streamUrl) return;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        xhrSetup: (xhr, url) => {
          xhr.withCredentials = false;
        }
      });
      hls.loadSource(movie.streamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (room.isPlaying) {
          video.play().catch(() => {});
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = movie.streamUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [movie?.streamUrl]);

  // Handle socket sync events
  useEffect(() => {
    if (!socket) return;

    const handlePlay = ({ currentTime: targetTime }: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      if (Math.abs(video.currentTime - targetTime) > 0.5) {
        video.currentTime = targetTime;
      }
      video.play().catch(() => {});
      setIsPlaying(true);
    };

    const handlePause = ({ currentTime: targetTime }: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = targetTime;
      video.pause();
      setIsPlaying(false);
    };

    const handleSeek = ({ currentTime: targetTime }: { currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    };

    socket.on('video_play', handlePlay);
    socket.on('video_pause', handlePause);
    socket.on('video_seek', handleSeek);

    return () => {
      socket.off('video_play', handlePlay);
      socket.off('video_pause', handlePause);
      socket.off('video_seek', handleSeek);
    };
  }, [socket, room.roomId]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      socket.emit('video_pause', { roomId: room.roomId, currentTime: video.currentTime });
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      socket.emit('video_play', { roomId: room.roomId, currentTime: video.currentTime });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    socket.emit('video_seek', { roomId: room.roomId, currentTime: newTime });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMuteAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div
      className="relative flex-1 bg-black flex flex-col items-center justify-center overflow-hidden select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handlePlayPause}
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
        playsInline
      />

      {/* Overlay Controls */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top bar info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg shadow">
              {movie?.title || 'Co-Watching'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenChat}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md border border-slate-700/60 shadow-lg transition-all"
              title="Open Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSearch}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white backdrop-blur-md border border-slate-700/60 shadow-lg transition-all"
              title="Change Movie"
            >
              <Film className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Big Play/Pause button for touch */}
        <div className="flex items-center justify-center">
          <button
            onClick={handlePlayPause}
            className="w-16 h-16 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transition-all transform hover:scale-105"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-white ml-1" />}
          </button>
        </div>

        {/* Bottom controls & Voice bar */}
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-slate-300">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handlePlayPause}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur-md border border-slate-700/60"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              </button>

              <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-xl backdrop-blur-md border border-slate-700/60">
                <button onClick={toggleMuteAudio} className="text-slate-300 hover:text-white">
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-indigo-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Voice chat participants bar */}
            <div className="hidden md:block">
              <VoiceChatBar
                users={room.users}
                currentUser={currentUser}
                onToggleMute={onToggleMute}
                onToggleVideo={onToggleVideo}
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white backdrop-blur-md border border-slate-700/60"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile voice bar */}
          <div className="block md:hidden">
            <VoiceChatBar
              users={room.users}
              currentUser={currentUser}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
