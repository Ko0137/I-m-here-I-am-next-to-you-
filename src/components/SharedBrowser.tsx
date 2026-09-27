import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Play, 
  Users, 
  Film, 
  Search,
  CheckCircle2,
  Sparkles,
  Link2,
  Layers,
  Star,
  Tv,
  Flame,
  Globe
} from 'lucide-react';
import { RoomState, User, Movie } from '../types';
import { appEventBus } from '../services/eventBus';
import axios from 'axios';

interface SharedBrowserProps {
  room: RoomState;
  currentUser: User | null;
  socket: any;
  onClose: () => void;
  onOpenSearch?: () => void;
  onSelectMovie?: (movie: Movie) => void;
}

interface WebCinemaSite {
  id: string;
  name: string;
  badge: string;
  category: string;
  domain: string;
}

const CINEMA_SOURCES: WebCinemaSite[] = [
  { id: 'lordfilm', name: 'Lordfilm (lordfilm.md)', badge: 'Премьеры 2026', category: 'Сериалы & Фильмы', domain: 'mg.lordfilm.md' },
  { id: 'kinogo', name: 'Kinogo (kinogo.mu)', badge: 'Full HD', category: 'Кинотеатр', domain: 'user.kinogo.mu' },
  { id: 'youtube', name: 'YouTube Тренды', badge: '4K Видео', category: 'Видеохостинг', domain: 'youtube.com' },
  { id: 'rezka', name: 'HDRezka', badge: 'Дубляж', category: 'Топ озвучки', domain: 'hdrezka.ag' }
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
  const [selectedSite, setSelectedSite] = useState<string>('lordfilm');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'search' | 'direct'>('catalog');
  const [directUrl, setDirectUrl] = useState('');
  const [directTitle, setDirectTitle] = useState('');

  // Fetch initial movies
  const fetchMovies = async (query = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.data?.results) {
        setMovies(res.data.results);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovies(searchQuery);
  }, [selectedSite]);

  // Sync navigation / site selection via socket so both users see the same
  useEffect(() => {
    if (!socket) return;

    const handleRemoteNavigate = (data: { url: string; userName?: string; site?: string }) => {
      if (data.site) {
        setSelectedSite(data.site);
      }
      if (data.url) {
        setSearchQuery(data.url);
        fetchMovies(data.url);
      }
    };

    socket.on('browser_remote_navigate', handleRemoteNavigate);
    return () => {
      socket.off('browser_remote_navigate', handleRemoteNavigate);
    };
  }, [socket]);

  const handleSelectSite = (siteId: string) => {
    setSelectedSite(siteId);
    if (socket && room && currentUser) {
      socket.emit('browser_navigate', {
        roomId: room.roomId,
        url: searchQuery,
        site: siteId,
        userId: currentUser.id,
        userName: currentUser.name
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchMovies(searchQuery.trim());

    if (socket && room && currentUser) {
      socket.emit('browser_navigate', {
        roomId: room.roomId,
        url: searchQuery.trim(),
        site: selectedSite,
        userId: currentUser.id,
        userName: currentUser.name
      });
    }
  };

  const handlePickMovie = (movie: Movie) => {
    appEventBus.emit('SUCCESS_FEEDBACK', `Фильм «${movie.title}» запущен у обоих зрителей!`);
    if (onSelectMovie) {
      onSelectMovie(movie);
    }
    onClose();
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = directUrl.trim();
    if (!clean) return;

    let derivedTitle = directTitle.trim();
    if (!derivedTitle) {
      try {
        const u = new URL(clean);
        derivedTitle = `Видео: ${u.hostname}`;
      } catch (e) {
        derivedTitle = 'Онлайн Видеопоток';
      }
    }

    const customMovie: Movie = {
      id: 'custom_' + Date.now(),
      title: derivedTitle,
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
      description: `Синхронный видеопоток: ${clean}`,
      rating: 9.4,
      genres: ['Прямой поток', 'Синхронно'],
      streamUrl: clean
    };

    handlePickMovie(customMovie);
  };

  return (
    <div className="flex-1 flex flex-col bg-stone-950 text-stone-100 overflow-hidden relative select-none">
      
      {/* Top Browser Navigation Header */}
      <div className="bg-stone-900 border-b border-stone-800 p-3 sm:p-4 flex items-center justify-between space-x-2 shrink-0">
        
        {/* Cinema Site Switcher */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-0.5">
          {CINEMA_SOURCES.map((site) => (
            <button
              key={site.id}
              type="button"
              onClick={() => handleSelectSite(site.id)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer ${
                selectedSite === site.id
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{site.name}</span>
            </button>
          ))}
        </div>

        {/* Back to video player */}
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-all shadow-md shrink-0 cursor-pointer"
        >
          К плееру
        </button>
      </div>

      {/* Instant Search Bar & Direct Link Tabs */}
      <div className="bg-stone-900/60 border-b border-stone-800 px-3 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full max-w-2xl relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-stone-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Поиск любого фильма или сериала на ${CINEMA_SOURCES.find(s => s.id === selectedSite)?.name}...`}
            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-2xl py-2 pl-10 pr-20 text-xs text-white placeholder-stone-500 outline-none transition-all"
          />
          <button
            type="submit"
            className="absolute right-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3 py-1 rounded-xl text-xs transition-all cursor-pointer"
          >
            Найти
          </button>
        </form>

        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('direct')}
            className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-all"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Прямая ссылка</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Direct Link or Interactive Cinema Catalog */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {activeTab === 'direct' ? (
          <div className="max-w-md mx-auto bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4 my-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Link2 className="w-5 h-5" />
              <h3 className="font-extrabold text-base text-white">Вставить ссылку на фильм или видео</h3>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Вставьте адрес любого фильма, ролика YouTube, .mp4 или .m3u8 видеопотока — он запустится одновременно у обоих зрителей.
            </p>
            <form onSubmit={handleDirectSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Ссылка на фильм *</label>
                <input
                  type="text"
                  value={directUrl}
                  onChange={(e) => setDirectUrl(e.target.value)}
                  placeholder="https://... (mp4, m3u8, youtube или страница фильма)"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-white placeholder-stone-500 outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1">Название фильма</label>
                <input
                  type="text"
                  value={directTitle}
                  onChange={(e) => setDirectTitle(e.target.value)}
                  placeholder="Например: Любимый фильм"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-white placeholder-stone-500 outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-700 cursor-pointer"
                >
                  Назад к каталогу
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black shadow-md cursor-pointer"
                >
                  Включить для двоих
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {/* Site status banner */}
            <div className="flex items-center justify-between bg-stone-900/60 border border-stone-800 rounded-2xl px-4 py-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="text-xs font-bold text-white">
                  Источник: {CINEMA_SOURCES.find(s => s.id === selectedSite)?.name}
                </span>
              </div>
              <span className="text-[11px] text-amber-400 font-medium">
                Нажмите на любой фильм — он сразу включится у обоих зрителей
              </span>
            </div>

            {/* Movies Grid */}
            {loading ? (
              <div className="flex items-center justify-center p-12 text-amber-400 space-x-2">
                <RotateCw className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold">Загрузка фильмов с сайта...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => handlePickMovie(movie)}
                    className="group relative flex flex-col overflow-hidden rounded-3xl bg-stone-900 border border-stone-800 hover:border-amber-500/80 active:scale-[0.98] transition-all cursor-pointer shadow-lg select-none"
                  >
                    <div className="aspect-[2/3] overflow-hidden relative bg-stone-950">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent"></div>

                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="h-12 w-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transform group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-stone-950 ml-0.5" />
                        </div>
                      </div>

                      <div className="absolute top-2.5 left-2.5 flex items-center space-x-1 rounded-md bg-emerald-500 text-stone-950 px-2 py-0.5 text-[10px] font-black">
                        <span>2026</span>
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1 rounded-full bg-stone-950/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-stone-800">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{movie.rating}</span>
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                      <div>
                        <h4 className="font-extrabold text-white text-xs sm:text-sm group-hover:text-amber-400 transition-colors line-clamp-1">
                          {movie.title}
                        </h4>
                        <p className="text-[10px] text-stone-400 line-clamp-2 mt-0.5">
                          {movie.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[10px] font-bold text-amber-400">
                        <span>Смотреть вместе</span>
                        <Play className="w-3 h-3 fill-amber-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
};
