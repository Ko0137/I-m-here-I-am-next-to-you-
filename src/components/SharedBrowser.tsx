import React, { useState, useEffect, useRef } from 'react';
import { Globe, ArrowLeft, ArrowRight, RotateCw, ExternalLink, Users, Sparkles, Shield, Compass, Search } from 'lucide-react';
import { RoomState, User } from '../types';
import { appEventBus } from '../services/eventBus';

interface SharedBrowserProps {
  room: RoomState;
  currentUser: User | null;
  socket: any;
  onClose: () => void;
}

const POPULAR_SITES = [
  { name: 'Google Поиск', url: 'https://google.com', badge: 'Поиск фильмов' },
  { name: 'КиноПоиск', url: 'https://www.kinopoisk.ru', badge: 'Каталог' },
  { name: 'Kinogo', url: 'https://kinogo.mu', badge: 'Онлайн' },
  { name: 'Lordfilm', url: 'https://lordfilm.md', badge: 'Сериалы' },
  { name: 'YouTube', url: 'https://youtube.com', badge: 'Видео' }
];

export const SharedBrowser: React.FC<SharedBrowserProps> = ({
  room,
  currentUser,
  socket,
  onClose
}) => {
  const browserState = room.sharedBrowser;
  const initialUrl = browserState?.currentUrl || 'https://google.com';

  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
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
      if (e.data?.type === 'BROWSER_NAVIGATE') {
        const nextUrl = e.data.url;
        handleNavigate(nextUrl);
      } else if (e.data?.type === 'BROWSER_SCROLL') {
        if (socket && room) {
          socket.emit('browser_scroll', { roomId: room.roomId, scrollY: e.data.scrollY });
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [socket, room, currentUser]);

  const handleNavigate = (targetUrl: string) => {
    let clean = targetUrl.trim();
    if (!clean) return;

    // Natural language / Russian query recognition
    const lower = clean.toLowerCase();
    if (lower.includes('киного') || lower.includes('kinogo')) {
      clean = 'https://kinogo.mu';
    } else if (lower.includes('лордфильм') || lower.includes('lordfilm')) {
      clean = 'https://lordfilm.md';
    } else if (lower.includes('ютуб') || lower.includes('youtube')) {
      clean = 'https://m.youtube.com';
    } else if (lower.includes('кинопоиск') || lower.includes('kinopoisk')) {
      clean = 'https://www.kinopoisk.ru';
    } else if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = 'https://' + clean;
      } else {
        // Direct search across movie engines
        clean = `https://www.google.com/search?q=${encodeURIComponent(clean)}`;
      }
    }

    setCurrentUrl(clean);
    setInputUrl(clean);
    setIsLoading(true);

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

  const handleTakeControl = () => {
    if (socket && room && currentUser) {
      socket.emit('browser_navigate', {
        roomId: room.roomId,
        url: currentUrl,
        userId: currentUser.id,
        userName: currentUser.name
      });
      appEventBus.emit('SUCCESS_FEEDBACK', 'Вы взяли управление браузером');
    }
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
            onClick={() => {
              setIsLoading(true);
              if (iframeRef.current) {
                iframeRef.current.src = proxySrc;
              }
            }}
            className={`p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors ${isLoading ? 'animate-spin text-amber-400' : ''}`}
            title="Обновить страницу"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox / Search & URL Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleNavigate(inputUrl);
          }}
          className="flex-1 flex items-center bg-stone-950 border border-stone-800 rounded-2xl px-3 py-1.5 focus-within:border-amber-500/80 transition-all max-w-2xl"
        >
          <Search className="w-4 h-4 text-stone-500 mr-2 shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Введите адрес сайта (lordfilm, kinogo, youtube) или поисковый запрос..."
            className="w-full bg-transparent text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none truncate font-medium"
          />
        </form>

        {/* Sync Status & Close Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>Экран транслируется: {controllerName}</span>
          </div>

          {!isController && (
            <button
              type="button"
              onClick={handleTakeControl}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all"
            >
              Взять управление
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Bookmarks / Quick Search Suggestions */}
      <div className="bg-stone-950/80 border-b border-stone-800/60 px-3 py-1.5 flex items-center space-x-2 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
          <Compass className="w-3 h-3 text-amber-400" />
          <span>Быстрый поиск:</span>
        </span>
        {POPULAR_SITES.map((site) => (
          <button
            key={site.name}
            type="button"
            onClick={() => handleNavigate(site.url)}
            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 active:bg-amber-500/20 text-stone-300 hover:text-amber-400 border border-stone-800 text-[11px] font-medium shrink-0 flex items-center space-x-1 transition-all"
          >
            <span>{site.name}</span>
            <span className="text-[9px] text-stone-500 font-normal">({site.badge})</span>
          </button>
        ))}
      </div>

      {/* Mobile Live Presence Notice */}
      <div className="sm:hidden bg-amber-500/10 border-b border-amber-500/20 px-3 py-1 text-[11px] text-amber-300 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Трансляция для всех гостей комнаты</span>
        </span>
        <span className="font-bold">{controllerName}</span>
      </div>

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

    </div>
  );
};
