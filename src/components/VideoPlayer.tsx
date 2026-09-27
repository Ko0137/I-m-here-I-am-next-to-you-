import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, RotateCw, Film, Radio, Layers, Sparkles, Tv, ExternalLink } from 'lucide-react';
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
  const [selectedEpisodeIdx, setSelectedEpisodeIdx] = useState(0);
  const controlsTimeoutRef = useRef<any>(null);

  const movie = room.movie;
  const currentStreamUrl = movie?.episodes?.[selectedEpisodeIdx]?.streamUrl || movie?.streamUrl || '';

  // Determine if stream is a YouTube embed
  const isYouTube = currentStreamUrl.includes('youtube.com') || currentStreamUrl.includes('youtu.be');
  let youtubeVideoId = '';
  if (isYouTube) {
    if (currentStreamUrl.includes('v=')) {
      try {
        youtubeVideoId = new URL(currentStreamUrl).searchParams.get('v') || '';
      } catch (e) {}
    } else if (currentStreamUrl.includes('youtu.be/')) {
      youtubeVideoId = currentStreamUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (currentStreamUrl.includes('embed/')) {
      youtubeVideoId = currentStreamUrl.split('embed/')[1]?.split('?')[0] || '';
    }
  }

  // Initialize HLS.js or HTML5 Video
  useEffect(() => {
    if (isYouTube) return;
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
  }, [currentStreamUrl, isYouTube]);

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
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
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
        {isYouTube && youtubeVideoId ? (
          <div className="w-full h-full relative">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&rel=0`}
              title="YouTube Player"
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <video
            ref={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
            playsInline
          />
        )}

        {/* Sync Status Badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 rounded-full bg-stone-950/80 backdrop-blur-md border border-stone-800 px-3 py-1 text-xs font-semibold text-amber-400">
          <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>Синхронизировано в комнате</span>
        </div>

        {/* Video Overlay Play/Pause Button for HTML5 Video */}
        {!isYouTube && (
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
        )}

        {/* Bottom Video Controls Bar for HTML5 Video */}
        {!isYouTube && (
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
                  className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors"
                  title="Назад на 10 секунд"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => skipTime(10)}
                  className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors"
                  title="Вперед на 10 секунд"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1.5 pl-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
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
                      if (videoRef.current) {
                        videoRef.current.volume = val;
                        videoRef.current.muted = false;
                      }
                      setIsMuted(false);
                    }}
                    className="w-16 md:w-24 h-1 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Center Movie Info */}
              <div className="hidden sm:flex flex-col items-center">
                <span className="text-xs font-bold text-white max-w-xs truncate">{movie?.title}</span>
                <span className="text-[10px] text-amber-400/80 font-mono">1080p Ultra HD • Full Synchronized</span>
              </div>

              {/* Right Controls */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800/80 transition-colors"
                >
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Episodes / Seasons Bar (If available) */}
      {movie?.episodes && movie.episodes.length > 1 && (
        <div className="bg-stone-900 border-t border-stone-800 px-4 py-2 flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-bold text-stone-400 shrink-0 flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Серии:</span>
          </span>
          {movie.episodes.map((ep, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedEpisodeIdx(idx)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedEpisodeIdx === idx
                  ? 'bg-amber-500 text-stone-950 shadow-md'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {ep.title}
            </button>
          ))}
        </div>
      )}

      {/* Floating Room Control Bar */}
      <div className="bg-stone-900/95 border-t border-stone-800 p-3 sm:p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl overflow-hidden bg-stone-800 shrink-0 border border-stone-700">
            <img src={movie?.poster} alt={movie?.title} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-bold text-stone-100">{movie?.title}</span>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                {movie?.rating ? `★ ${movie.rating}` : 'HD'}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 truncate max-w-[200px] sm:max-w-md">
              {movie?.genres?.join(' • ') || 'Совместный просмотр'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold transition-all shadow-sm"
          >
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline">Сменить фильм</span>
          </button>

          {onToggleBrowser && (
            <button
              type="button"
              onClick={onToggleBrowser}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
                isBrowserActive
                  ? 'bg-amber-500 text-stone-950 border-amber-400 font-black'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span className="hidden sm:inline">Браузер сайтов</span>
            </button>
          )}

          <MicToggleButton
            isMuted={currentUser?.isMuted || false}
            onToggle={onToggleMute}
          />

          <VideoToggleButton
            isVideoOn={currentUser?.isVideoOn || false}
            onToggle={onToggleVideo}
          />

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
