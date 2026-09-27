import React, { useState, useEffect, useRef } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Users, Sparkles, Shield, Compass, Search, Play, Film, Link2 } from 'lucide-react';
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

const POPULAR_SITES = [
  { name: 'КиноКаталог 4K', url: 'https://user.kinogo.mu', badge: '100+ Новинок' },
  { name: 'YouTube Тренды', url: 'https://youtube.com', badge: 'Видео' },
  { name: 'Lordfilm HD', url: 'https://mg.lordfilm.md/podborki/', badge: 'Сериалы' },
  { name: 'Google Поиск', url: 'https://google.com', badge: 'Поиск' }
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
  const initialUrl = browserState?.currentUrl || 'https://user.kinogo.mu';

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [videoDetected, setVideoDetected] = useState(false);
  const [customStreamModal, setCustomStreamModal] = useState(false);
  const [customStreamInput, setCustomStreamInput] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isController = browserState ? browserState.controllerId === currentUser?.id : true;
  const controllerName = browserState?.controllerName || currentUser?.name || 'Вы';

  // Listen to remote navigation events from socket
  useEffect(() => {
    if (!socket) return;

    const handleRemoteNavigate = (data: { url: string }) => {
      setCurrentUrl(data.url);
      setInputUrl(data.url);
      setIsLoading(true);
      setVideoDetected(false);
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

  // Listen for navigation & scroll messages from inside proxy iframe
  useEffect(() => {
    const handleWindowMessage = (e: MessageEvent) => {
      if (!e.data) return;

      if (e.data.type === 'BROWSER_NAVIGATE') {
        const nextUrl = e.data.url;
        handleNavigate(nextUrl);
      } else if (e.data?.type === 'BROWSER_SCROLL') {
        if (socket && room) {
          socket.emit('browser_scroll', { roomId: room.roomId, scrollY: e.data.scrollY });
        }
      } else if (e.data.type === 'VIDEO_FOUND_ON_PAGE') {
        setVideoDetected(true);
      } else if (e.data.type === 'LAUNCH_DEFAULT_STREAM') {
        handlePlayCurrentAsMovie(e.data.url || currentUrl);
      } else if (e.data.type === 'OPEN_SEARCH_MODAL') {
        if (onOpenSearch) onOpenSearch();
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [socket, room, currentUser, currentUrl]);

  const handleNavigate = (targetUrl: string) => {
    let clean = targetUrl.trim();
    if (!clean) return;

    // Avoid recursive loading of current host
    if (clean.includes(window.location.host) || clean.includes('/api/proxy-page')) {
      clean = 'https://google.com';
    }

    // Natural language / Russian query recognition
    const lower = clean.toLowerCase();
    if (lower.includes('киного') || lower.includes('kinogo')) {
      clean = 'https://user.kinogo.mu';
    } else if (lower.includes('лордфильм') || lower.includes('lordfilm')) {
      clean = 'https://mg.lordfilm.md/podborki/';
    } else if (lower.includes('ютуб') || lower.includes('youtube')) {
      clean = 'https://youtube.com';
    } else if (lower.includes('кинопоиск') || lower.includes('kinopoisk')) {
      clean = 'https://www.kinopoisk.ru';
    } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = 'https://' + clean;
      } else {
        clean = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
      }
    }

    setCurrentUrl(clean);
    setInputUrl(clean);
    setIsLoading(true);
    setVideoDetected(false);

    appEventBus.emit('BROWSER_NAVIGATED', { url: clean });

    if (socket && room && currentUser) {
      socket.emit('browser_navigate', {
        roomId: room.roomId,
        url: clean,
        userId: currentUser.id,
        userName: currentUser.name
      });
    }
  };

  const handlePlayCurrentAsMovie = (urlToPlay?: string) => {
    const stream = urlToPlay || currentUrl;
    let movieTitle = 'Онлайн Видеопоток';
    try {
      const parsed = new URL(stream);
      movieTitle = `Видео: ${parsed.hostname}`;
    } catch (e) {}

    const generatedMovie: Movie = {
      id: 'custom_' + Date.now(),
      title: movieTitle,
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
      description: `Синхронный видеопоток с веб-страницы: ${stream}`,
      rating: 9.0,
      genres: ['Веб-поток', 'Синхронно'],
      streamUrl: stream
    };

    if (onSelectMovie) {
      onSelectMovie(generatedMovie);
    }
    onClose();
  };

  const handleCustomStreamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStreamInput.trim()) return;
    handlePlayCurrentAsMovie(customStreamInput.trim());
    setCustomStreamModal(false);
  };

  const proxySrc = `/api/proxy-page?url=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-100 overflow-hidden relative select-none">
      
      {/* Top Browser Toolbar (Like Chrome / Safari) */}
      <div className="bg-stone-900 border-b border-stone-800 p-2 sm:p-3 flex items-center justify-between space-x-2 shrink-0">
        
        {/* Navigation & Tab controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
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

        {/* Address Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 max-w-2xl relative flex items-center"
        >
          <div className="absolute left-3 text-stone-500 pointer-events-none flex items-center">
            {currentUrl.startsWith('https') ? (
              <Shield className="w-3.5 h-3.5 text-emerald-500 mr-1" />
            ) : (
              <Globe className="w-3.5 h-3.5 mr-1" />
            )}
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Введите адрес сайта, ссылку на видео или фильм..."
            className="w-full bg-stone-950/80 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 rounded-2xl py-1.5 pl-8 pr-20 text-xs text-stone-200 placeholder-stone-500 outline-none transition-all"
          />

          <div className="absolute right-1.5 flex items-center space-x-1">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3 py-1 rounded-xl text-[11px] shadow-sm transition-all"
            >
              Перейти
            </button>
          </div>
        </form>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCustomStreamModal(true)}
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold border border-stone-700 transition-all"
            title="Вставить прямую ссылку на видео"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Прямая ссылка</span>
          </button>

          {onOpenSearch && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30 transition-all"
              title="Открыть каталог фильмов"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Каталог</span>
            </button>
          )}

          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            title="Открыть во внешней вкладке"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Quick Sites Bookmarks */}
      <div className="bg-stone-950 border-b border-stone-800/80 px-3 py-1.5 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
          <Compass className="w-3 h-3 text-amber-500" />
          <span>Быстрый выбор:</span>
        </span>
        {POPULAR_SITES.map((site) => (
          <button
            key={site.name}
            type="button"
            onClick={() => handleNavigate(site.url)}
            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-amber-500/20 text-stone-300 hover:text-amber-400 border border-stone-800 text-[11px] font-medium shrink-0 flex items-center space-x-1 transition-all"
          >
            <span>{site.name}</span>
            <span className="text-[9px] text-amber-400/80 font-normal">({site.badge})</span>
          </button>
        ))}
      </div>

      {/* Video Detected Action Banner */}
      {videoDetected && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-2.5 text-stone-950 flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center space-x-2 text-xs font-black">
            <Film className="w-4 h-4" />
            <span>На странице найден фильм/видеоплеер!</span>
          </div>
          <button
            type="button"
            onClick={() => handlePlayCurrentAsMovie()}
            className="bg-stone-950 hover:bg-stone-900 text-amber-400 font-bold px-3.5 py-1 rounded-xl text-xs shadow-md flex items-center space-x-1.5 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-amber-400" />
            <span>Запустить в плеере для всех</span>
          </button>
        </div>
      )}

      {/* Main Shared Webview Frame */}
      <div className="flex-1 relative bg-stone-900">
        <iframe
          ref={iframeRef}
          src={proxySrc}
          title="Shared In-App Browser"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-none bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />

        {isLoading && (
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center pointer-events-none">
            <div className="flex items-center space-x-2 bg-stone-900/90 border border-stone-800 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold text-amber-400">
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Загрузка сайта и синхронизация экрана...</span>
            </div>
          </div>
        )}
      </div>

      {/* Direct Custom Stream Modal */}
      {customStreamModal && (
        <div className="absolute inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Link2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Вставить ссылку на видео/фильм</h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Поддерживаются: YouTube ссылки, прямые видеопотоки (.mp4, .m3u8), ссылки на плееры Kinogo, Lordfilm и любые онлайн-кинотеатры.
            </p>
            <form onSubmit={handleCustomStreamSubmit} className="space-y-3">
              <input
                type="text"
                value={customStreamInput}
                onChange={(e) => setCustomStreamInput(e.target.value)}
                placeholder="https://... (например YouTube, mp4 или m3u8 поток)"
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-stone-100 placeholder-stone-500 outline-none focus:border-amber-500"
                autoFocus
              />
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomStreamModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold hover:bg-amber-400 transition-all"
                >
                  Запустить в комнате
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
