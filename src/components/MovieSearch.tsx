import React, { useState } from 'react';
import { Search, Film, Star, X, Loader2, Play } from 'lucide-react';
import { Movie } from '../types';
import axios from 'axios';

interface MovieSearchProps {
  onSelectMovie: (movie: Movie) => void;
  onClose: () => void;
}

export const MovieSearch: React.FC<MovieSearchProps> = ({ onSelectMovie, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Movie[]>([]);

  const defaultMovies: Movie[] = [
    {
      id: 'lordfilm-spider',
      title: 'Человек-паук: Через вселенные',
      originalTitle: 'Spider-Man: Into the Spider-Verse',
      year: 2024,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
      description: 'Культовый анимационный шедевр о Майлзе Моралесе и бесконечных версиях Человека-паука.',
      rating: 8.8,
      genres: ['Мультфильм', 'Боевик', 'Lordfilm'],
      streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
    },
    {
      id: 'kinogo-interstellar',
      title: 'Интерстеллар (Kinogo HD)',
      originalTitle: 'Interstellar',
      year: 2024,
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
      description: 'Фантастический эпос Кристофера Нолана о путешествии сквозь червоточину в поисках нового дома.',
      rating: 9.0,
      genres: ['Фантастика', 'Драма', 'Kinogo'],
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'youtube-stream-live',
      title: 'YouTube 4K Природные пейзажи & Lofi',
      originalTitle: 'YouTube 4K Ambient',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
      description: 'Идеальный расслабляющий стрим для совместных посиделок и фонового общения.',
      rating: 9.3,
      genres: ['YouTube', 'Релакс', 'Музыка'],
      streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
    }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await axios.get(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data?.results?.length) {
        setResults(res.data.results);
      } else {
        setResults(defaultMovies);
      }
    } catch (err) {
      setResults(defaultMovies);
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

  const displayList = results.length > 0 ? results : defaultMovies;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xl flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">Выбор фильма или сериала</h2>
              <p className="text-xs text-stone-400">Поиск по Kinogo, Lordfilm и YouTube</p>
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

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="p-4 border-b border-stone-800 bg-stone-950/50 flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название фильма или сериала..."
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

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-1">
            {results.length > 0 ? `Найдено результатов (${results.length})` : 'Рекомендованные потоки'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayList.map((movie) => (
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
                      <span>{movie.rating}</span>
                    </span>
                    <span>•</span>
                    <span className="truncate">{movie.genres?.[0] || 'Кино'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
