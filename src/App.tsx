import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Maximize, 
  Volume2, 
  VolumeX, 
  Globe, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Radio, 
  Send, 
  X, 
  Sparkles,
  Search,
  Star,
  Users,
  Film,
  Plus,
  ArrowLeft,
  Share2
} from 'lucide-react';
import { User, RoomState, MovieItem, ChatMessage } from './types';
import { socketService } from './services/socket';
import axios from 'axios';

const SITES = [
  { id: 'lordfilm', name: 'Lordfilm (Премьеры 2026)', domain: 'lordfilm.md', logo: '🎬' },
  { id: 'kinogo', name: 'Kinogo HD', domain: 'kinogo.mu', logo: '🍿' },
  { id: 'youtube', name: 'YouTube 4K', domain: 'youtube.com', logo: '▶️' }
];

export default function App() {
  const [user, setUser] = useState<User>({
    id: 'user_' + Math.floor(Math.random() * 100000),
    name: 'Пользователь'
  });
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [movies, setMovies] = useState<MovieItem[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const localCamRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Telegram User automatically
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor('#09090b');

        if (tg.initDataUnsafe?.user) {
          const u = tg.initDataUnsafe.user;
          const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Пользователь';
          setUser({
            id: String(u.id),
            name: fullName,
            avatar: u.photo_url
          });
        }
      } catch (e) {}
    }

    const s = socketService.connect();
    setSocket(s);

    s.on('room_state', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
      setSearchInput(updatedRoom.searchQuery || '');
    });

    s.on('search_input_sync', ({ query }: { query: string }) => {
      setSearchInput(query);
    });

    s.on('video_play', ({ currentTime }: { currentTime: number }) => {
      if (videoRef.current) {
        if (Math.abs(videoRef.current.currentTime - currentTime) > 1.5) {
          videoRef.current.currentTime = currentTime;
        }
        videoRef.current.play().catch(() => {});
      }
    });

    s.on('video_pause', ({ currentTime }: { currentTime: number }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
        videoRef.current.pause();
      }
    });

    s.on('video_seek', ({ currentTime }: { currentTime: number }) => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTime;
      }
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Fetch movies whenever site or search input changes
  useEffect(() => {
    if (!room) return;
    const site = room.currentSite || 'lordfilm';
    const query = searchInput.trim();
    axios.get(`/api/movies?site=${site}&q=${encodeURIComponent(query)}`)
      .then(res => {
        if (res.data?.results) {
          setMovies(res.data.results);
        }
      })
      .catch(() => {});
  }, [room?.currentSite, searchInput, room]);

  // Video Player source setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room?.currentMovie?.streamUrl) return;

    const streamUrl = room.currentMovie.streamUrl;

    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (room.isPlaying) video.play().catch(() => {});
      });
    } else {
      video.src = streamUrl;
      if (room.isPlaying) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [room?.currentMovie, room?.activeView]);

  // User camera setup
  useEffect(() => {
    if (isVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: !isMuted })
        .then(stream => {
          localStreamRef.current = stream;
          if (localCamRef.current) {
            localCamRef.current.srcObject = stream;
            localCamRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (localCamRef.current) {
        localCamRef.current.srcObject = null;
      }
    }
  }, [isVideoOn, isMuted]);

  // Scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.chat, isChatOpen]);

  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newUser: User = { ...user, isHost: true };
    setUser(newUser);
    socket?.emit('join_room', { roomId, user: newUser });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim()) return;
    const roomId = joinInput.trim().toUpperCase();
    socket?.emit('join_room', { roomId, user });
  };

  const handleSelectSite = (siteId: string) => {
    if (!room || !socket) return;
    socket.emit('site_change', { roomId: room.roomId, site: siteId, userName: user.name });
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (!room || !socket) return;
    socket.emit('search_input_sync', { roomId: room.roomId, query: val });
  };

  const handleMoviePick = (movie: MovieItem) => {
    if (!room || !socket) return;
    socket.emit('movie_selected', { roomId: room.roomId, movie, userName: user.name });
  };

  const handleTogglePlay = () => {
    if (!videoRef.current || !room || !socket) return;
    if (room.isPlaying) {
      videoRef.current.pause();
      socket.emit('video_pause', { roomId: room.roomId, currentTime: videoRef.current.currentTime });
    } else {
      videoRef.current.play().catch(() => {});
      socket.emit('video_play', { roomId: room.roomId, currentTime: videoRef.current.currentTime });
    }
  };

  const handleSeek = (seconds: number) => {
    if (!videoRef.current || !room || !socket) return;
    const newTime = Math.max(0, videoRef.current.currentTime + seconds);
    videoRef.current.currentTime = newTime;
    socket.emit('video_seek', { roomId: room.roomId, currentTime: newTime });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !room || !socket) return;
    socket.emit('send_message', {
      roomId: room.roomId,
      message: { userId: user.id, userName: user.name, text: chatMessage.trim() }
    });
    setChatMessage('');
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    socket?.emit('update_user_media', { roomId: room?.roomId, userId: user.id, isMuted: next });
  };

  const handleToggleVideo = () => {
    const next = !isVideoOn;
    setIsVideoOn(next);
    socket?.emit('update_user_media', { roomId: room?.roomId, userId: user.id, isVideoOn: next });
  };

  const handleCopyLink = () => {
    if (!room) return;
    const url = window.location.origin + '?room=' + room.roomId;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 1. Initial State (No Room joined)
  if (!room) {
    return (
      <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between py-6 space-y-6">
          
          {/* User Welcome */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-zinc-950 font-black text-sm flex items-center justify-center shadow-lg shadow-amber-500/20">
                {user.name[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-medium">Добро пожаловать в Telegram</p>
                <h2 className="text-base font-bold text-white">Вы зашли как: <span className="text-amber-400">{user.name}</span></h2>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-emerald-400">
              Online
            </span>
          </div>

          {/* Main Action Banner */}
          <div className="space-y-4 my-auto">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">
                🎬
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Совместный просмотр кино</h1>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Создайте комнату, открывайте любой сайт фильмов и смотрите вместе секунда в секунду.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>СОЗДАТЬ КОМНАТУ</span>
              </button>
            </div>

            {/* Join Room Box */}
            <form onSubmit={handleJoinRoom} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex items-center space-x-2">
              <input
                type="text"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="Код комнаты (например: A1B2C3)"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs transition-all cursor-pointer"
              >
                Войти
              </button>
            </form>
          </div>

          <div className="text-center text-[11px] text-zinc-500">
            Я рядом • Синхронный кинозал в Telegram
          </div>
        </div>
      </div>
    );
  }

  // 2. Room Screen (Shared In-App Browser & Synchronized Player)
  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none">
      
      {/* Top Header Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-30">
        
        {/* Left Room Info */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setRoom(null)}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Выйти из комнаты"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black text-white">Комната #{room.roomId}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Участников: {room.users.length} ({room.users.map(u => u.name).join(', ')})
            </p>
          </div>
        </div>

        {/* Right View Switcher & Action buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            title="Пригласить любимого человека"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copiedLink ? 'Скопировано!' : 'Пригласить'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextView = room.activeView === 'browser' ? 'player' : 'browser';
              socket?.emit('view_change', { roomId: room.roomId, view: nextView, userName: user.name });
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center space-x-1.5 ${
              room.activeView === 'browser'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'bg-zinc-800 text-amber-300 hover:bg-zinc-700'
            }`}
          >
            {room.activeView === 'browser' ? (
              <>
                <Film className="w-3.5 h-3.5" />
                <span>К плееру</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span>Открыть сайт фильмов</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Interactive Screen */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {room.activeView === 'browser' ? (
          
          /* IN-APP SHARED BROWSER (Lordfilm, Kinogo, YouTube) */
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
            
            {/* Sites Selector Tabs */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-2 sm:p-2.5 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider shrink-0 mr-1">
                Сайты:
              </span>
              {SITES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSite(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 ${
                    room.currentSite === s.id
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <span>{s.logo}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>

            {/* Live Synchronized Search Input */}
            <div className="bg-zinc-900/60 border-b border-zinc-800 p-3 shrink-0">
              <div className="relative max-w-xl mx-auto flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={`Поиск фильма на ${SITES.find(s => s.id === room.currentSite)?.name}... (видно обоим)`}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-2xl py-2 pl-10 pr-4 text-xs text-white placeholder-zinc-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Movies Catalog on the Selected Site */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-300">
                  Фильмы на сайте {SITES.find(s => s.id === room.currentSite)?.name} ({movies.length})
                </span>
                <span className="text-[11px] text-amber-400 font-medium">
                  Нажмите на любой фильм — он сразу включится у обоих зрителей
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {movies.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleMoviePick(m)}
                    className="group relative flex flex-col overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 hover:border-amber-500 active:scale-98 transition-all cursor-pointer shadow-lg"
                  >
                    <div className="aspect-[2/3] overflow-hidden relative bg-zinc-950">
                      <img
                        src={m.poster}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="h-12 w-12 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-zinc-950 ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute top-2.5 left-2.5 rounded-md bg-emerald-500 text-zinc-950 px-2 py-0.5 text-[10px] font-black">
                        {m.year || 2026}
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 rounded-full bg-zinc-950/90 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-zinc-800 flex items-center space-x-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{m.rating || 9.0}</span>
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                      <h4 className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        {m.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 line-clamp-2">
                        {m.description}
                      </p>
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] font-bold text-amber-400">
                        <span>Смотреть вместе</span>
                        <Play className="w-3 h-3 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : (
          
          /* SYNCHRONIZED FULLSCREEN VIDEO PLAYER */
          <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
            
            <div className="relative flex-1 flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                onEnded={() => socket?.emit('video_pause', { roomId: room.roomId, currentTime: 0 })}
              />

              {/* Status Indicator */}
              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-3 py-1 text-xs font-semibold text-amber-400">
                <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>Синхронизировано у всех зрителей</span>
              </div>

              {/* Picture-in-Picture Webcam */}
              {isVideoOn && (
                <div className="absolute top-4 right-4 z-20 w-32 aspect-video rounded-2xl overflow-hidden border-2 border-amber-500 shadow-2xl bg-zinc-900">
                  <video ref={localCamRef} className="w-full h-full object-cover mirror" autoPlay playsInline muted />
                  <div className="absolute bottom-1 left-1.5 bg-black/80 px-1 py-0.5 rounded text-[8px] font-bold text-amber-400">Вы</div>
                </div>
              )}

              {/* Big Touch Play/Pause Overlay */}
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/20 hover:bg-zinc-950/30 transition-all cursor-pointer"
              >
                <div className="h-16 w-16 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-2xl transform active:scale-90 transition-transform">
                  {room.isPlaying ? <Pause className="w-8 h-8 fill-zinc-950" /> : <Play className="w-8 h-8 fill-zinc-950 ml-1" />}
                </div>
              </div>
            </div>

            {/* Bottom Playback Controls */}
            <div className="bg-zinc-900/95 border-t border-zinc-800 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                  <img src={room.currentMovie?.poster} alt={room.currentMovie?.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col max-w-[120px] sm:max-w-xs truncate">
                  <span className="text-xs font-bold text-white truncate">{room.currentMovie?.title}</span>
                  <span className="text-[10px] text-amber-400">1080p Ultra HD</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSeek(-10)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Назад на 10 сек"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="p-2 rounded-xl bg-amber-500 text-zinc-950 font-black transition-all cursor-pointer shadow-md"
                >
                  {room.isPlaying ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeek(10)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Вперед на 10 сек"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        )}

        {/* 3 Communication Options Bar (Voice, Video, Text Chat) */}
        <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-bold text-zinc-400">
            Связь в комнате:
          </div>

          <div className="flex items-center space-x-2">
            {/* Voice Mic Toggle */}
            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                isMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'Микрофон выкл' : 'Голос вкл'}</span>
            </button>

            {/* Video Camera Toggle */}
            <button
              type="button"
              onClick={handleToggleVideo}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                isVideoOn ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {isVideoOn ? <VideoIcon className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>Камера</span>
            </button>

            {/* Text Chat Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                isChatOpen ? 'bg-amber-500 text-zinc-950 shadow-md' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Чат</span>
            </button>
          </div>
        </div>

        {/* Text Chat Drawer Panel */}
        {isChatOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-zinc-950/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col z-40 shadow-2xl animate-in slide-in-from-right duration-150">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <MessageSquare className="w-4 h-4" />
                <span className="text-white">Чат комнаты</span>
              </div>
              <button type="button" onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {room.chat.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.userId === user.id ? 'items-end' : 'items-start'}`}>
                  {m.userId !== 'system' && (
                    <span className="text-[10px] text-zinc-500 mb-0.5">{m.userName}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-xs ${
                    m.userId === 'system'
                      ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 text-center w-full py-1 text-[10px]'
                      : m.userId === user.id
                        ? 'bg-amber-500 text-zinc-950 font-medium rounded-tr-none'
                        : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-800 flex items-center space-x-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Сообщение..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!chatMessage.trim()}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </main>
    </div>
  );
}
