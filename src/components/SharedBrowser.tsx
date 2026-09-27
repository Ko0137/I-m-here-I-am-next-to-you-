import React, { useState, useEffect, useRef } from 'react';
import { 
  Tv, 
  ScreenShare, 
  ScreenShareOff, 
  ExternalLink, 
  Sparkles, 
  Link2, 
  Play, 
  RotateCw, 
  ShieldCheck, 
  Compass, 
  Globe, 
  Film,
  Search,
  Users,
  Radio
} from 'lucide-react';
import { RoomState, User, Movie } from '../types';
import { appEventBus } from '../services/eventBus';

interface SharedBrowserProps {
  room: RoomState;
  currentUser: User | null;
  socket: any;
  onClose: () => void;
  onOpenSearch?: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

const QUICK_DISCOVERY = [
  { name: 'Kinogo HD', url: 'https://user.kinogo.mu', category: 'Фильмы' },
  { name: 'Lordfilm', url: 'https://mg.lordfilm.md', category: 'Сериалы' },
  { name: 'YouTube', url: 'https://www.youtube.com', category: 'Шоу & Видео' },
  { name: 'RuTube', url: 'https://rutube.ru', category: 'Видеохостинг' },
  { name: 'Яндекс Поиск', url: 'https://ya.ru', category: 'Поиск' }
];

export const SharedBrowser: React.FC<SharedBrowserProps> = ({
  room,
  currentUser,
  socket,
  onClose,
  onOpenSearch,
  onSelectMovie
}) => {
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sharerName, setSharerName] = useState<string | null>(null);
  const [directVideoUrl, setDirectVideoUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showDirectModal, setShowDirectModal] = useState(false);
  
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<any>(null);

  // Check if Telegram WebApp supports openTelegramLink / openLink
  const openInTelegramBrowser = (targetUrl: string) => {
    let clean = targetUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }

    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa) {
        if (twa.HapticFeedback) twa.HapticFeedback.impactOccurred('medium');
        if (twa.openLink) {
          twa.openLink(clean);
          return;
        }
      }
    } catch (e) {}

    window.open(clean, '_blank', 'noopener,noreferrer');
  };

  // Screen share handlers for synchronized live broadcast
  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'browser'
        } as any,
        audio: true
      });

      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
        screenVideoRef.current.play().catch(() => {});
      }

      setIsScreenSharing(true);
      setSharerName(currentUser?.name || 'Вы');

      if (socket && room) {
        socket.emit('screen_share_status', {
          roomId: room.roomId,
          isSharing: true,
          sharerName: currentUser?.name || 'Пользователь'
        });
      }

      // Stream frames via canvas snapshots to participants
      const canvas = canvasRef.current || document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 640;
      canvas.height = 360;

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (screenVideoRef.current && ctx && !screenVideoRef.current.paused) {
          try {
            ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
            const frameData = canvas.toDataURL('image/jpeg', 0.5);
            if (socket && room) {
              socket.emit('screen_frame_broadcast', { roomId: room.roomId, frameData });
            }
          } catch (e) {}
        }
      }, 250);

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (err) {
      console.warn('Screen share cancelled or not supported on this device', err);
    }
  };

  const stopScreenShare = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
    setSharerName(null);

    if (socket && room) {
      socket.emit('screen_share_status', {
        roomId: room.roomId,
        isSharing: false,
        sharerName: ''
      });
    }
  };

  // Listen for remote screen share frames
  useEffect(() => {
    if (!socket) return;

    const handleRemoteFrame = ({ frameData }: { frameData: string }) => {
      const img = document.getElementById('remote-screen-view') as HTMLImageElement;
      if (img) {
        img.src = frameData;
      }
    };

    const handleStatus = ({ isSharing, sharerName: name }: { isSharing: boolean; sharerName: string }) => {
      setIsScreenSharing(isSharing);
      setSharerName(isSharing ? name : null);
    };

    socket.on('screen_frame_received', handleRemoteFrame);
    socket.on('screen_share_status', handleStatus);

    return () => {
      socket.off('screen_frame_received', handleRemoteFrame);
      socket.off('screen_share_status', handleStatus);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [socket]);

  // Submit direct video URL to the synced room player
  const handleDirectVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directVideoUrl.trim();
    if (!clean) return;

    let derivedTitle = customTitle.trim();
    if (!derivedTitle) {
      try {
        const u = new URL(clean);
        derivedTitle = `Видео: ${u.hostname}`;
      } catch (e) {
        derivedTitle = 'Онлайн Видеопоток';
      }
    }

    const newMovie: Movie = {
      id: 'custom_' + Date.now(),
      title: derivedTitle,
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
      description: `Синхронное воспроизведение: ${clean}`,
      rating: 9.2,
      genres: ['Веб-поток', 'Синхронно'],
      streamUrl: clean
    };

    if (onSelectMovie) {
      onSelectMovie(newMovie);
    }
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-100 overflow-y-auto relative select-none">
      
      {/* Top Header Bar */}
      <div className="bg-stone-900 border-b border-stone-800/80 p-3 sm:p-4 flex items-center justify-between shrink-0 shadow-lg">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-stone-950 font-black shadow-md shadow-amber-500/10">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
              <span>Совместный Поиск & Трансляция</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                LIVE
              </span>
            </h2>
            <p className="text-[11px] text-stone-400">
              Открывайте любые сайты фильмов, делитесь экраном или вставляйте прямые ссылки
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowDirectModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-stone-950" />
            <span>Вставить ссылку</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-6 pb-20">

        {/* Live Broadcast Card */}
        <div className="bg-gradient-to-b from-stone-900 to-stone-900/60 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">Параллельная трансляция для всех участников</h3>
                <p className="text-xs text-stone-400">
                  {isScreenSharing 
                    ? `Трансляцию ведет: ${sharerName || 'Пользователь'}`
                    : 'Запустите трансляцию экрана или вкладки браузера, чтобы все гости видели фильм'}
                </p>
              </div>
            </div>

            <div>
              {isScreenSharing ? (
                <button
                  type="button"
                  onClick={stopScreenShare}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-black transition-all"
                >
                  <ScreenShareOff className="w-4 h-4" />
                  <span>Остановить трансляцию</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startScreenShare}
                  className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-stone-950 text-xs font-black shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all"
                >
                  <ScreenShare className="w-4 h-4" />
                  <span>Транслировать экран / фильм</span>
                </button>
              )}
            </div>
          </div>

          {/* Screen Broadcast Display Canvas / Video */}
          {isScreenSharing ? (
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-stone-800 flex items-center justify-center shadow-inner">
              <video
                ref={screenVideoRef}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted
              />
              <img
                id="remote-screen-view"
                alt="Live Broadcast"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
              <div className="absolute top-3 left-3 bg-rose-600/90 text-white px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase flex items-center space-x-1.5 backdrop-blur-md shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span>В ЭФИРЕ: {sharerName}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-950/40 p-6 flex flex-col items-center text-center space-y-2">
              <ScreenShare className="w-8 h-8 text-stone-600" />
              <p className="text-xs font-semibold text-stone-300">Трансляция экрана не запущена</p>
              <p className="text-[11px] text-stone-500 max-w-md">
                Нажмите «Транслировать экран / фильм», чтобы передавать видеоряд из любой вкладки или стороннего плеера прямо гостям в комнату.
              </p>
            </div>
          )}
        </div>

        {/* Quick Launch Websites in In-App Telegram Web Browser */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center space-x-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Популярные сайты для поиска фильмов</span>
            </h3>
            <span className="text-xs text-stone-500 hidden sm:inline">
              Открываются во встроенном браузере Telegram
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {QUICK_DISCOVERY.map((site) => (
              <div
                key={site.name}
                onClick={() => openInTelegramBrowser(site.url)}
                className="group flex items-center justify-between p-4 rounded-2xl bg-stone-900/80 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-900 active:scale-[0.98] transition-all cursor-pointer shadow-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-white group-hover:text-amber-400 transition-colors">
                      {site.name}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {site.category}
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-stone-800 text-stone-400 group-hover:text-white transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Search on Kinogo & Lordfilm */}
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-5 space-y-3">
          <h3 className="font-bold text-xs sm:text-sm text-stone-200 flex items-center space-x-2">
            <Search className="w-4 h-4 text-amber-400" />
            <span>Быстрый поиск в поисковике фильмов</span>
          </h3>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              id="search-movie-query"
              placeholder="Введите название фильма, например: Дюна 2, Оппенгеймер..."
              className="flex-1 bg-stone-950 border border-stone-800 rounded-2xl px-4 py-2.5 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value;
                  if (val.trim()) {
                    openInTelegramBrowser(`https://www.google.com/search?q=${encodeURIComponent(val.trim() + ' смотреть онлайн hd')}`);
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('search-movie-query') as HTMLInputElement;
                if (el && el.value.trim()) {
                  openInTelegramBrowser(`https://www.google.com/search?q=${encodeURIComponent(el.value.trim() + ' смотреть онлайн hd')}`);
                }
              }}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md cursor-pointer transition-all"
            >
              Найти фильм в сети
            </button>
          </div>
        </div>

      </div>

      {/* Direct Video Input Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Play className="w-5 h-5 fill-amber-400" />
              <h3 className="text-base font-extrabold text-white">Вставить ссылку на фильм/видео</h3>
            </div>
            
            <p className="text-xs text-stone-400 leading-relaxed">
              Скопируйте и вставьте сюда ссылку с любого сайта (YouTube, Kinogo, Lordfilm, .mp4 или .m3u8). Фильм сразу синхронизируется у всех гостей.
            </p>

            <form onSubmit={handleDirectVideoSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Ссылка на фильм или видео *</label>
                <input
                  type="text"
                  value={directVideoUrl}
                  onChange={(e) => setDirectVideoUrl(e.target.value)}
                  placeholder="https://... (например YouTube, mp4 видео, m3u8 поток или сайт фильма)"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Название фильма (опционально)</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Например: Мой любимый фильм"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md"
                >
                  Запустить для всех
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
