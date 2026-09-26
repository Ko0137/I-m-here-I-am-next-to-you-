import React, { useState, useEffect } from 'react';
import { Search, Film, Star, Play, X, Loader2 } from 'lucide-react';
import { Movie } from '../types';
import axios from 'axios';

interface MovieSearchProps {
  onSelectMovie: (movie: Movie) => void;
  onClose: () => void;
}

export const MovieSearch: React.FC<MovieSearchProps> = ({ onSelectMovie, onClose }) => {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
        setMovies(res.data.results || []);
      } catch (err) {
        console.error('Failed to search movies:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchMovies, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white font-bold text-lg">
            <Film className="w-5 h-5 text-indigo-400" />
            <span>Select Movie or Series</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, series, animation..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* Results grid */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 space-x-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-sm">Searching catalogs...</span>
            </div>
          )}

          {!loading && movies.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Film className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No movies found. Try another query.</p>
            </div>
          )}

          {!loading && movies.map((movie) => (
            <div
              key={movie.id}
              className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all group"
            >
              <div className="flex items-center space-x-3.5">
                <img
                  src={movie.poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300'}
                  alt={movie.title}
                  className="w-14 h-20 object-cover rounded-lg shadow-md shrink-0 bg-slate-700"
                />
                <div>
                  <h3 className="font-semibold text-white text-sm group-hover:text-indigo-400 transition-colors">
                    {movie.title} {movie.year ? `(${movie.year})` : ''}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    {movie.rating && (
                      <span className="flex items-center space-x-1 text-amber-400 text-xs font-medium">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{movie.rating}</span>
                      </span>
                    )}
                    {movie.genres && (
                      <span className="text-slate-400 text-xs truncate max-w-[200px]">
                        {movie.genres.join(', ')}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 max-w-md">
                    {movie.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectMovie(movie);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 transition-all shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Watch Together</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
