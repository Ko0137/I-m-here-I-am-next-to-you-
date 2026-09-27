import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Globe, 
  MessageSquare, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Radio, 
  Send, 
  X, 
  Search, 
  Plus, 
  ArrowLeft, 
  ArrowRight,
  Share2,
  Film,
  RotateCw as ReloadIcon
} from 'lucide-react';
import { User, RoomState, MovieItem, ChatMessage } from './types';
import { socketService } from './services/socket';

const POPULAR_SITES = [
  { name: 'Google Поиск', url: 'https://www.google.com' },
  { name: 'Kinogo HD', url: 'https://user.kinogo.mu' },
  { name: 'Lordfilm', url: 'https://mg.lordfilm.md' },
  { name: 'YouTube', url: 'https://www.youtube.com' }
];

export default function App() {
  const [user, setUser] = useState<User>({
    id: 'u_' + Math.floor(Math.random() * 100000),
    name: 'Константин'
  });
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const localCamRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize Telegram User Profile
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (tg.setHeaderColor) tg.setHeaderColor('#09090b');

        if (tg.initDataUnsafe?.user) {
          const u = tg.initDataUnsafe.user;
          const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Константин';
          setUser({
            id: String(u.id),
            name: name,
            avatar: u.photo_url
          });
        }
      } catch (e) {}
    }

    const s = socketService.connect();
    setSocket(s);

    s.on('room_state', (updated: RoomState) => {
      setRoom(updated);
      if (updated.currentSite) {
        setBrowserUrl(updated.currentSite);
        setInputUrl(updated.currentSite);
      }
    });

    s.on('remote_browser_navigate', ({ url }: { url: string }) => {
      setBrowserUrl(url);
      setInputUrl(url);
    });

    s.on('remote_browser_scroll', ({ scrollY }: { scrollY: number }) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'REMOTE_SCROLL_ACTION', scrollY }, '*');
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

    // Check direct room parameter
    const qRoom = new URLSearchParams(window.location.search).get('room');
    if (qRoom) {
      setJoinCode(qRoom);
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Listen to messages from inside the live proxied website iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || !room || !socket) return;

      if (e.data.type === 'SITE_NAVIGATE_EVENT') {
        const nextUrl = e.data.url;
        setBrowserUrl(nextUrl);
        setInputUrl(nextUrl);
        socket.emit('browser_navigate', { roomId: room.roomId, url: nextUrl, userName: user.name });
      } else if (e.data.type === 'SITE_SCROLL_EVENT') {
        socket.emit('browser_scroll', { roomId: room.roomId, scrollY: e.data.scrollY });
      } else if (e.data.type === 'MOVIE_CLICKED_EVENT') {
        const movieTitle = e.data.title || 'Выбранный фильм';
        const poster = e.data.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop';
        
        const selectedMovie: MovieItem = {
          id: 'movie_' + Date.now(),
          title: movieTitle,
          poster: poster,
          year: 2026,
          streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
        };

        socket.emit('movie_selected', { roomId: room.roomId, movie: selectedMovie, userName: user.name });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [room, socket, user]);

  // Video playback initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !room?.currentMovie?.streamUrl) return;

    const stream = room.currentMovie.streamUrl;

    if (Hls.isSupported() && stream.includes('.m3u8')) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(stream);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (room.isPlaying) video.play().catch(() => {});
      });
    } else {
      video.src = stream;
      if (room.isPlaying) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [room?.currentMovie, room?.activeView]);

  // Camera video chat
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

  // Scroll chat
  useEffect(() => {
    if (isChatOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.chat, isChatOpen]);

  // Instant optimistic room creation
  const handleCreateRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const current: User = { ...user, isHost: true };
    setUser(current);

    // Optimistically enter room
    setRoom({
      roomId,
      hostId: current.id,
      users: [current],
      chat: [{
        id: 'sys_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: `Комната #${roomId} открыта. Ищите фильмы в Google и смотрите вместе!`,
        timestamp: Date.now()
      }],
      currentMovie: {
        id: 'spider-man-2026',
        title: 'Человек-паук: Новый день (2026)',
        year: 2026,
        poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
        rating: 9.4,
        genres: ['Премьера 2026', 'Боевик'],
        description: 'Масштабная премьера 2026 года. Синхронный просмотр в Full HD качестве.',
        streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
      },
      isPlaying: false,
      currentTime: 0,
      currentSite: 'https://www.google.com',
      searchQuery: '',
      activeView: 'browser',
      lastUpdated: Date.now()
    });

    socket?.emit('join_room', { roomId, user: current });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    const roomId = joinCode.trim().toUpperCase();

    // Optimistically open
    setRoom({
      roomId,
      hostId: '',
      users: [user],
      chat: [{
        id: 'sys_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: `Вход в комнату #${roomId}...`,
        timestamp: Date.now()
      }],
      currentMovie: {
        id: 'spider-man-2026',
        title: 'Человек-паук: Новый день (2026)',
        year: 2026,
        poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
        streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
      },
      isPlaying: false,
      currentTime: 0,
      currentSite: 'https://www.google.com',
      searchQuery: '',
      activeView: 'browser',
      lastUpdated: Date.now()
    });

    socket?.emit('join_room', { roomId, user });
  };

  const handleNavigateUrl = (target: string) => {
    let clean = target.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = 'https://' + clean;
      } else {
        clean = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
      }
    }

    setBrowserUrl(clean);
    setInputUrl(clean);
    if (room && socket) {
      socket.emit('browser_navigate', { roomId: room.roomId, url: clean, userName: user.name });
    }
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
    if (!chatText.trim() || !room || !socket) return;
    socket.emit('send_message', {
      roomId: room.roomId,
      message: { userId: user.id, userName: user.name, text: chatText.trim() }
    });
    setChatText('');
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

  const handleCopy = () => {
    if (!room) return;
    const shareUrl = window.location.origin + '?room=' + room.roomId;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. HOME SCREEN
  if (!room) {
    return (
      <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 overflow-y-auto select-none">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-between py-6 space-y-6">
          
          {/* User Profile */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-zinc-950 font-black text-base flex items-center justify-center shadow-lg shadow-amber-500/20">
                {user.name[0]?.toUpperCase() || 'К'}
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-medium">Ваш профиль в Telegram:</p>
                {isEditingName ? (
                  <div className="flex items-center space-x-1.5 mt-1">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="bg-zinc-900 border border-amber-500 rounded-lg px-2 py-1 text-xs text-white outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (tempName.trim()) setUser({ ...user, name: tempName.trim() });
                        setIsEditingName(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-bold cursor-pointer"
                    >
                      Ок
                    </button>
                  </div>
                ) : (
                  <h2 
                    onClick={() => {
                      setTempName(user.name);
                      setIsEditingName(true);
                    }}
                    className="text-base font-extrabold text-amber-400 cursor-pointer hover:underline flex items-center space-x-1"
                    title="Нажмите, чтобы изменить имя"
                  >
                    <span>{user.name}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">(изменить)</span>
                  </h2>
                )}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
              В сети
            </span>
          </div>

          {/* Main Create Action */}
          <div className="space-y-4 my-auto">
            <div className="bg-gradient-to-b from-zinc-900 to-zinc-900/60 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
                🍿
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Совместный просмотр кино</h1>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  Ищите любые фильмы в Google или на сайтах, лазайте по страницам вместе и смотрите кино синхронно.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-zinc-950 font-black text-sm shadow-xl shadow-amber-500/20 hover:opacity-95 active:scale-98 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>СОЗДАТЬ КОМНАТУ</span>
              </button>
            </div>

            <form onSubmit={handleJoinRoom} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 flex items-center space-x-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Код комнаты (например: ABC123)"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500 uppercase font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs transition-all cursor-pointer"
              >
                Войти
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-zinc-500">
            Я рядом • Совместный Google-браузер и кинотеатр для двоих
          </p>
        </div>
      </div>
    );
  }

  // 2. LIVE SHARED ROOM
  const liveProxySrc = `/api/live-site?url=${encodeURIComponent(browserUrl)}`;

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none">
      
      {/* Room Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 px-3 flex items-center justify-between shrink-0 z-30">
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
            <p className="text-[10px] text-zinc-400">
              {room.users.map(u => u.name).join(' ❤️ ')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
            title="Пригласить любимого человека"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copied ? 'Скопировано!' : 'Пригласить'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextView = room.activeView === 'browser' ? 'player' : 'browser';
              socket?.emit('view_change', { roomId: room.roomId, view: nextView });
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
                <span>Открыть поиск</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Interactive Workspace */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {room.activeView === 'browser' ? (
          
          /* REAL IN-APP LIVE SYNCHRONIZED BROWSER */
          <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
            
            {/* Quick Sites Bar */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-2 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider shrink-0 mr-1">
                Сайты:
              </span>
              {POPULAR_SITES.map((site) => (
                <button
                  key={site.name}
                  type="button"
                  onClick={() => handleNavigateUrl(site.url)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    browserUrl.includes(site.url.replace('https://', '').replace('http://', ''))
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {site.name}
                </button>
              ))}
            </div>

            {/* Address bar with two-way sync */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNavigateUrl(inputUrl);
              }}
              className="bg-zinc-900/80 border-b border-zinc-800 p-2 sm:p-2.5 flex items-center space-x-2 shrink-0"
            >
              <button
                type="button"
                onClick={() => handleNavigateUrl(browserUrl)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                title="Перезагрузить"
              >
                <ReloadIcon className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex-1 flex items-center">
                <Globe className="absolute left-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Введите запрос для поиска в Google или адрес сайта..."
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl py-1.5 pl-8 pr-16 text-xs text-white placeholder-zinc-500 outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                >
                  Искать
                </button>
              </div>
            </form>

            {/* Synchronized Live Webview */}
            <div className="flex-1 relative bg-zinc-950">
              <iframe
                ref={iframeRef}
                src={liveProxySrc}
                title="Shared Browser"
                className="w-full h-full border-none bg-zinc-950"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>

          </div>
        ) : (
          
          /* SYNCHRONIZED HD MOVIE PLAYER */
          <div className="flex-1 flex flex-col relative bg-black overflow-hidden">
            <div className="relative flex-1 flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                onEnded={() => socket?.emit('video_pause', { roomId: room.roomId, currentTime: 0 })}
              />

              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-3 py-1 text-xs font-semibold text-amber-400">
                <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                <span>Синхронизировано у обоих зрителей</span>
              </div>

              {isVideoOn && (
                <div className="absolute top-4 right-4 z-20 w-32 aspect-video rounded-2xl overflow-hidden border-2 border-amber-500 shadow-2xl bg-zinc-900">
                  <video ref={localCamRef} className="w-full h-full object-cover mirror" autoPlay playsInline muted />
                  <div className="absolute bottom-1 left-1.5 bg-black/80 px-1 py-0.5 rounded text-[8px] font-bold text-amber-400">Вы</div>
                </div>
              )}

              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/20 hover:bg-zinc-950/30 transition-all cursor-pointer"
              >
                <div className="h-16 w-16 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-2xl transform active:scale-90 transition-transform">
                  {room.isPlaying ? <Pause className="w-8 h-8 fill-zinc-950" /> : <Play className="w-8 h-8 fill-zinc-950 ml-1" />}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="bg-zinc-900/95 border-t border-zinc-800 p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700">
                  <img src={room.currentMovie?.poster} alt={room.currentMovie?.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col max-w-[140px] sm:max-w-xs truncate">
                  <span className="text-xs font-bold text-white truncate">{room.currentMovie?.title}</span>
                  <span className="text-[10px] text-amber-400">1080p Full HD</span>
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

        {/* Bottom Communication Bar */}
        <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-bold text-zinc-400">
            Связь для двоих:
          </div>

          <div className="flex items-center space-x-2">
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

        {/* Chat Drawer */}
        {isChatOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-zinc-950/95 border-l border-zinc-800 backdrop-blur-xl flex flex-col z-40 shadow-2xl animate-in slide-in-from-right duration-150">
            <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <MessageSquare className="w-4 h-4" />
                <span className="text-white">Чат комнаты</span>
              </div>
              <button type="button" onClick={() => setIsChatOpen(false)} className="text-zinc-400 hover:text-white p-1 cursor-pointer">
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
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-800 flex items-center space-x-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Сообщение..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!chatText.trim()}
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
