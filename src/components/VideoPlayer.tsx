import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw, 
  RotateCw, 
  Film, 
  Radio, 
  Layers, 
  Sparkles, 
  Tv, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Users,
  Compass
} from 'lucide-react';
import { Movie, RoomState, User } from '../types';

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
  const localCamVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(room.isPlaying);
  const [currentTime, setCurrentTime] = useState(room.currentTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(currentUser?.isMuted || false);
  const [isVideoOn, setIsVideoOn] = useState(currentUser?.isVideoOn || false);
  const [showControls, setShowControls] = useState(true);
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState(0);
  const [activeCommMode, setActiveCommMode] = useState<'chat' | 'voice' | 'video'>('chat');
  const controlsTimeoutRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const movie = room.movie;
  const currentStreamUrl = movie?.episodes?.[selectedEpisodeIdx]?.streamUrl || movie?.streamUrl || '';

  // Local camera stream management for in-player video chat
  useEffect(() => {
    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted })
        .then((stream) => {
          localStreamRef.current = stream;
          if (localCamVideoRef.current) {
            localCamVideoRef.current.srcObject = stream;
            localCamVideoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (localCamVideoRef.current) {
        localCamVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isVideoOn, isMuted]);

  // Initialize HLS.js or HTML5 Video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentStreamUrl) return;

    if (Hls.isSupported() && (currentStreamUrl.includes('.m3u8') || !currentStreamUrl.includes('.mp4'))) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
        enableWorker: true
      });
      hls.loadSource(currentStreamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (room.isPlaying) {
          video.play().catch(() => {});
        }
      });
    } else {
      video.src = currentStreamUrl;
      if (room.isPlaying) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [currentStreamUrl]);

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

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    onToggleMute(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOn;
    setIsVideoOn(next);
    onToggleVideo(next);
  };

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
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

        {/* Sync Room Status Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 rounded-full bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1 text-xs font-semibold text-amber-400">
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Астана ↔ Россия • Синхронно</span>
        </div>

        {/* Picture-in-Picture Video Chat Overlay */}
        {isVideoOn && (
          <div className="absolute top-4 right-4 z-20 w-28 sm:w-36 aspect-video rounded-2xl overflow-hidden border-2 border-amber-500 shadow-2xl bg-stone-900">
            <video
              ref={localCamVideoRef}
              className="w-full h-full object-cover mirror"
              autoPlay
              playsInline
              muted
            />
            <div className="absolute bottom-1 left-1.5 bg-black/70 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-400">
              Вы
            </div>
          </div>
        )}

        {/* Center Play/Pause Touch */}
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

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 text-amber-400 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => skipTime(-10)}
                className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors cursor-pointer"
                title="Назад на 10 секунд"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => skipTime(10)}
                className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors cursor-pointer"
                title="Вперед на 10 секунд"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Center Movie Info */}
            <div className="hidden sm:flex flex-col items-center">
              <span className="text-xs font-bold text-white max-w-xs truncate">{movie?.title}</span>
              <span className="text-[10px] text-amber-400/80 font-mono">1080p Ultra HD • Lordfilm & Kinogo Sync</span>
            </div>

            {/* Right Fullscreen */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors cursor-pointer"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Communication Mode Selector (Текстовый чат, Голосовой чат, Видеочат) */}
      <div className="bg-stone-900/95 border-t border-stone-800 p-2.5 sm:p-3 flex items-center justify-between">
        
        {/* Movie Summary */}
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl overflow-hidden bg-stone-800 shrink-0 border border-stone-700">
            <img src={movie?.poster} alt={movie?.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col max-w-[140px] sm:max-w-xs truncate">
            <span className="text-xs font-bold text-stone-100 truncate">{movie?.title}</span>
            <span className="text-[10px] text-amber-400 font-medium">Синхронный показ</span>
          </div>
        </div>

        {/* 3 Communication Types & Browser Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          
          {/* In-App Shared Browser Switcher */}
          {onToggleBrowser && (
            <button
              type="button"
              onClick={onToggleBrowser}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
                isBrowserActive
                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                  : 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-stone-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Выбрать другой фильм на сайте</span>
            </button>
          )}

          {/* 1. Voice Chat Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
            title="Голосовой чат"
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden md:inline">{isMuted ? 'Микрофон выкл' : 'Голос вкл'}</span>
          </button>

          {/* 2. Video Chat Toggle */}
          <button
            type="button"
            onClick={toggleVideo}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isVideoOn
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="Видеочат"
          >
            {isVideoOn ? <VideoIcon className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">Видеочат</span>
          </button>

          {/* 3. Text Chat Toggle */}
          <button
            type="button"
            onClick={onOpenChat}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isChatOpen
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
            title="Текстовый чат"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Чат</span>
          </button>

        </div>
      </div>
    </div>
  );
};
