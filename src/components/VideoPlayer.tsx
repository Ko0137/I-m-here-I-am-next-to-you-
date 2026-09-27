import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Film, Radio } from 'lucide-react';
import { Movie, RoomState, User } from '../types';
import { ChatToggleButton } from './buttons/ChatToggleButton';
import { MicToggleButton } from './buttons/MicToggleButton';
import { VideoToggleButton } from './buttons/VideoToggleButton';

interface VideoPlayerProps {
  room: RoomState;
  currentUser: User | null;
  socket: any;
  onOpenChat: () => void;
  onOpenSearch: () => void;
  onToggleMute: (isMuted: boolean) => void;
  onToggleVideo: (isVideoOn: boolean) => void;
  isChatOpen: boolean;
  onToggleBrowser?: () => void;
  isBrowserActive?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  room,
  currentUser,
  socket,
  onOpenChat,
  onOpenSearch,
  onToggleMute,
  onToggleVideo,
  isChatOpen,
  onToggleBrowser,
  isBrowserActive = false
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
        xhrSetup: (xhr) => {
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
      if (room.isPlaying) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [movie?.streamUrl]);

  // Synchronize playback events from socket
  useEffect(() => {
    if (!socket) return;

    const handlePlay = (data: { currentTime: number }) => {
      setIsPlaying(true);
      if (videoRef.current) {
        if (Math.abs(videoRef.current.currentTime - data.currentTime) > 1.5) {
          videoRef.current.currentTime = data.currentTime;
        }
        videoRef.current.play().catch(() => {});
      }
    };

    const handlePause = (data: { currentTime: number }) => {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.currentTime = data.currentTime;
        videoRef.current.pause();
      }
    };

    const handleSeek = (data: { currentTime: number }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = data.currentTime;
      }
    };

    socket.on('video_play', handlePlay);
    socket.on('video_pause', handlePause);
    socket.on('video_seek', handleSeek);

    return () => {
      socket.off('video_play', handlePlay);
      socket.off('video_pause', handlePause);
      socket.off('video_seek', handleSeek);
    };
  }, [socket]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      socket?.emit('video_pause', { roomId: room.roomId, currentTime: video.currentTime });
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
      socket?.emit('video_play', { roomId: room.roomId, currentTime: video.currentTime });
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    socket?.emit('video_seek', { roomId: room.roomId, currentTime: time });
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      socket?.emit('video_seek', { roomId: room.roomId, currentTime: newTime });
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseMove}
      className="flex-1 flex flex-col bg-stone-950 relative overflow-hidden select-none"
    >
      {/* Video Container */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain"
          playsInline
        />

        {/* Sync Status Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 rounded-full bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1 text-xs font-semibold text-amber-400">
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Синхронизировано для всех гостей</span>
        </div>

        {/* Video Overlay Play/Pause Button */}
        <div
          onClick={togglePlay}
          className={`absolute inset-0 z-10 flex items-center justify-center bg-stone-950/30 transition-opacity cursor-pointer ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="h-16 w-16 md:h-20 md:w-20 rounded-full bg-amber-500/90 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-2xl shadow-amber-500/30 transform active:scale-90 transition-transform">
            {isPlaying ? (
              <Pause className="w-8 h-8 md:w-10 md:h-10 fill-stone-950" />
            ) : (
              <Play className="w-8 h-8 md:w-10 md:h-10 fill-stone-950 ml-1" />
            )}
          </div>
        </div>

        {/* Bottom Video Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent p-4 md:p-6 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Timeline Bar */}
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-xs font-mono text-stone-300 w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeekChange}
              className="flex-1 h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
            />
            <span className="text-xs font-mono text-stone-400 w-10">
              {formatTime(duration)}
            </span>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-amber-400 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => skipTime(-10)}
                className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 transition-colors"
                title="Назад на 10 сек"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => skipTime(10)}
                className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 transition-colors"
                title="Вперед на 10 сек"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="hidden sm:flex items-center space-x-2 pl-2">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="text-stone-400 hover:text-white"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setIsMuted(val === 0);
                    if (videoRef.current) videoRef.current.volume = val;
                  }}
                  className="w-16 h-1 bg-stone-800 rounded appearance-none accent-amber-500"
                />
              </div>
            </div>

            {/* Right: Fullscreen & Movie Info */}
            <div className="flex items-center space-x-2">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-stone-200 truncate max-w-xs">{movie?.title}</p>
                <p className="text-[10px] text-amber-400/80 font-mono">1080p HD • Синхронный плеер</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) {
                    if (videoRef.current.requestFullscreen) {
                      videoRef.current.requestFullscreen();
                    }
                  }
                }}
                className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-stone-300 transition-colors"
                title="Во весь экран"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Social Interaction Bar */}
      <div className="h-18 bg-stone-950/95 border-t border-stone-800/80 px-4 md:px-8 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <MicToggleButton
            isMuted={currentUser?.isMuted ?? true}
            onToggle={onToggleMute}
          />
          <VideoToggleButton
            isVideoOn={currentUser?.isVideoOn ?? false}
            onToggle={onToggleVideo}
          />
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          {onToggleBrowser && (
            <button
              type="button"
              onClick={onToggleBrowser}
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer select-none ${
                isBrowserActive
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-amber-500/20'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border-stone-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>{isBrowserActive ? 'Вернуться к фильму' : 'Совместный браузер'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenSearch}
            className="px-3.5 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 hover:text-white font-semibold text-xs flex items-center space-x-2 transition-all"
          >
            <Film className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Каталог фильмов</span>
          </button>

          <ChatToggleButton
            isOpen={isChatOpen}
            onToggle={onOpenChat}
            unreadCount={0}
          />
        </div>
      </div>
    </div>
  );
};
