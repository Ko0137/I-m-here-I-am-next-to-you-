import React, { useState, useEffect } from 'react';
import { Search, Film, Star, X, Loader2, Play, Link2, Sparkles, Youtube, Flame } from 'lucide-react';
import { Movie } from '../types';
import axios from 'axios';

interface MovieSearchProps {
  onSelectMovie: (movie: Movie) => void;
  onClose: () => void;
}

export const MovieSearch: React.FC<MovieSearchProps> = ({ onSelectMovie, onClose }) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Movie[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const loadInitialCatalog = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/search');
      if (res.data?.results?.length) {
        setResults(res.data.results);
      }
    } catch (e) {
      // Handled by fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialCatalog();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data?.results) {
        setResults(res.data.results);
      }
    } catch (err) {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handlePick = (movie: Movie) => {
    try {
      const twa = (window as any).Telegram?.WebApp;
      if (twa?.HapticFeedback) {
        twa.HapticFeedback.notificationOccurred('success');
      }
    } catch (e) {}

    onSelectMovie(movie);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = customUrl.trim();
    if (!cleanUrl) return;

    let derivedTitle = customTitle.trim() || 'Пользовательский видеопоток';
    if (!customTitle.trim()) {
      try {
        const u = new URL(cleanUrl);
        derivedTitle = `Видео: ${u.hostname}`;
      } catch (e) {}
    }

    const customMovie: Movie = {
      id: 'custom_' + Date.now(),
      title: derivedTitle,
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
      description: `Пользовательский поток: ${cleanUrl}`,
      rating: 9.0,
      genres: ['Пользовательский', 'Онлайн'],
      streamUrl: cleanUrl
    };

    handlePick(customMovie);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Выбор фильма, сериала или ссылки</h2>
              <p className="text-xs text-stone-400">Синхронный просмотр 1080p для всех участников</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'catalog'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Каталог & Поиск</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'custom'
                ? 'bg-amber-500 text-stone-950 shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Вставить ссылку (YouTube, MP4, M3U8)</span>
          </button>
        </div>

        {activeTab === 'catalog' ? (
          <>
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="p-4 border-b border-stone-800 bg-stone-950/50 flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Введите название фильма, сериала или жанр..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-500/80 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition-all flex items-center space-x-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Найти</span>}
              </button>
            </form>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">
                {query ? `Результаты поиска (${results.length})` : `Популярные фильмы и премьеры (${results.length})`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => handlePick(movie)}
                    className="group flex space-x-3 p-3 rounded-2xl bg-stone-950/60 border border-stone-800/80 hover:border-amber-500/50 hover:bg-stone-950 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                  >
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-stone-800 shrink-0 relative">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-stone-100 group-hover:text-amber-400 transition-colors truncate">
                          {movie.title}
                        </h4>
                        <p className="text-[11px] text-stone-400 line-clamp-2 mt-1">
                          {movie.description}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px] text-stone-400 mt-2">
                        <span className="text-amber-400 font-bold flex items-center space-x-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{movie.rating || 9.0}</span>
                        </span>
                        <span>•</span>
                        <span className="truncate text-stone-300 font-medium">{movie.genres?.[0] || 'Кино'}</span>
                        {movie.episodes && movie.episodes.length > 0 && (
                          <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold">
                            {movie.episodes.length} серии
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Custom Stream Insertion */
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="bg-stone-950/60 border border-stone-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Смотрите любое видео из интернета вместе</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Вставьте любую ссылку на видео — приложение мгновенно подключит всех участников комнаты к синхронному воспроизведению.
              </p>
            </div>

            <form onSubmit={handleCustomSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Ссылка на видео или фильм *</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... или https://.../stream.m3u8"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Название (опционально)</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Например: YouTube Подкаст #42"
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-sm transition-all shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                <span>Запустить совместный просмотр</span>
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
