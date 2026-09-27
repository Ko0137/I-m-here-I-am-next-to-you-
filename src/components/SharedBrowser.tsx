import React, { useState, useEffect, useRef } from 'react';
import { 
  Globe, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Play, 
  Users, 
  Film, 
  Search,
  Tv,
  CheckCircle2,
  Sparkles,
  Link2,
  Layers
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

const CINEMA_BOOKMARKS = [
  { name: 'Lordfilm (Премьеры 2026)', url: 'https://mg.lordfilm.md' },
  { name: 'Kinogo HD', url: 'https://user.kinogo.mu' },
  { name: 'YouTube Тренды', url: 'https://www.youtube.com' },
  { name: 'Яндекс Поиск Фильмов', url: 'https://ya.ru' }
];

export const SharedBrowser: React.FC<SharedBrowserProps> = ({
  room,
  currentUser,
  socket,
  onClose,
  onOpenSearch,
  onSelectMovie
}) => {
  const browserState = room.sharedBrowser;
  const initialUrl = browserState?.currentUrl || 'https://mg.lordfilm.md';

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [lastMoviePicked, setLastMoviePicked] = useState<{ title: string; poster?: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const controllerName = browserState?.controllerName || currentUser?.name || 'Вы';
  const isController = browserState ? browserState.controllerId === currentUser?.id : true;

  // Listen for navigation sync from socket
  useEffect(() => {
    if (!socket) return;

    const handleRemoteNavigate = (data: { url: string; userName?: string }) => {
      setCurrentUrl(data.url);
      setInputUrl(data.url);
      setIsLoading(true);
    };

    const handleRemoteScroll = (data: { scrollY: number }) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'APPLY_REMOTE_SCROLL', scrollY: data.scrollY },
          '*'
        );
      }
    };

    socket.on('browser_remote_navigate', handleRemoteNavigate);
    socket.on('browser_remote_scroll', handleRemoteScroll);

    return () => {
      socket.off('browser_remote_navigate', handleRemoteNavigate);
      socket.off('browser_remote_scroll', handleRemoteScroll);
    };
  }, [socket]);

  // Listen to messages from inside the in-app proxied browser
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (!e.data) return;

      if (e.data.type === 'CINEMA_MOVIE_CLICKED') {
        const title = e.data.title || 'Выбранный фильм';
        const poster = e.data.poster || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop';
        const streamUrl = e.data.streamUrl || 'https://test-streams.mux.dev/x36h264/x36h264.m3u8';

        setLastMoviePicked({ title, poster });

        const selectedMovie: Movie = {
          id: 'movie_' + Date.now(),
          title: title,
          year: 2026,
          poster: poster,
          description: `Синхронный просмотр из каталога: ${title}`,
          rating: 9.1,
          genres: ['Lordfilm', 'Full HD', 'Синхронно'],
          streamUrl: streamUrl,
          episodes: [
            { season: 1, episode: 1, title: 'Серия 1 (1080p Дубляж)', streamUrl: streamUrl }
          ]
        };

        if (onSelectMovie) {
          onSelectMovie(selectedMovie);
        }

        appEventBus.emit('SUCCESS_FEEDBACK', `Фильм «${title}» запущен у обоих участников!`);
      } else if (e.data.type === 'BROWSER_NAVIGATE_SYNC') {
        handleNavigate(e.data.url);
      } else if (e.data.type === 'BROWSER_SCROLL_SYNC') {
        if (socket && room) {
          socket.emit('browser_scroll', { roomId: room.roomId, scrollY: e.data.scrollY });
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [socket, room, onSelectMovie]);

  const handleNavigate = (targetUrl: string) => {
    let clean = targetUrl.trim();
    if (!clean) return;

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = 'https://' + clean;
      } else {
        clean = `https://www.google.com/search?q=${encodeURIComponent(clean + ' смотреть онлайн')}`;
      }
    }

    setCurrentUrl(clean);
    setInputUrl(clean);
    setIsLoading(true);

    if (socket && room && currentUser) {
      socket.emit('browser_navigate', {
        roomId: room.roomId,
        url: clean,
        userId: currentUser.id,
        userName: currentUser.name
      });
    }
  };

  const proxySrc = `/api/proxy-browser?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-100 overflow-hidden relative select-none">
      
      {/* Top Browser Bar */}
      <div className="bg-stone-900 border-b border-stone-800 p-2 sm:p-3 flex items-center justify-between space-x-2 shrink-0">
        
        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.history.back();
              }
            }}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Назад"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.history.forward();
              }
            }}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Вперед"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleNavigate(currentUrl)}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Обновить"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>

        {/* Address & Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 max-w-xl relative flex items-center"
        >
          <div className="absolute left-3 text-stone-500 pointer-events-none flex items-center">
            <Globe className="w-3.5 h-3.5 mr-1 text-amber-500" />
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Введите адрес сайта или название фильма..."
            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-2xl py-1.5 pl-8 pr-16 text-xs text-stone-200 placeholder-stone-500 outline-none transition-all"
          />

          <button
            type="submit"
            className="absolute right-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-2.5 py-1 rounded-xl text-[10px] shadow-sm transition-all"
          >
            Найти
          </button>
        </form>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="hidden sm:flex items-center space-x-1 text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
            <Users className="w-3.5 h-3.5" />
            <span>Синхронизировано у обоих</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            К плееру
          </button>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="bg-stone-950 border-b border-stone-800/80 px-3 py-1.5 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3 h-3" />
          <span>Сайты:</span>
        </span>
        {CINEMA_BOOKMARKS.map((site) => (
          <button
            key={site.name}
            type="button"
            onClick={() => handleNavigate(site.url)}
            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-amber-500/20 text-stone-300 hover:text-amber-400 border border-stone-800 text-[11px] font-medium shrink-0 flex items-center space-x-1 transition-all"
          >
            <span>{site.name}</span>
          </button>
        ))}
      </div>

      {/* Interactive In-App Synchronized Browser Iframe */}
      <div className="flex-1 relative bg-stone-950">
        <iframe
          ref={iframeRef}
          src={proxySrc}
          title="In-App Synchronized Browser"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-none bg-stone-950"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />

        {isLoading && (
          <div className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="flex items-center space-x-2 bg-stone-900 border border-stone-800 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold text-amber-400">
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Загрузка и синхронизация сайта...</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
