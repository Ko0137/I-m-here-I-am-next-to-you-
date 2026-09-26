import React, { useState } from 'react';
import { Film, Users, Play, Plus, Compass, Sparkles, Tv } from 'lucide-react';
import { Movie } from '../types';

interface HomeProps {
  onCreateRoom: (roomId: string) => void;
  onJoinRoom: (roomId: string) => void;
  onSelectMovie: (movie: Movie) => void;
}

export const Home: React.FC<HomeProps> = ({ onCreateRoom, onJoinRoom, onSelectMovie }) => {
  const [inputRoomId, setInputRoomId] = useState('');

  const handleCreate = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onCreateRoom(randomId);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    onJoinRoom(inputRoomId.trim().toUpperCase());
  };

  return (
    <div className="flex-1 bg-slate-950 text-white overflow-y-auto p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 md:p-10 overflow-hidden shadow-2xl">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Я рядом — Совместный просмотр</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              Смотрите фильмы и сериалы вместе с друзьями
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              Мгновенная синхронизация плеера, голосовой чат и сообщения прямо в Telegram Mini App.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
              <button
                onClick={handleCreate}
                className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Создать комнату</span>
              </button>

              <form onSubmit={handleJoin} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="Код комнаты"
                  className="bg-slate-900 border border-slate-700/80 rounded-2xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors uppercase tracking-wider font-mono w-40"
                />
                <button
                  type="submit"
                  className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition-all"
                >
                  Войти
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Quick Sample Movies */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              <span>Популярные фильмы и потоки</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              {
                id: 'kinogo-hub',
                title: 'Kinogo Каталог (kinogo.mu)',
                year: 2026,
                genre: 'Кинотеатр',
                poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
                streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
                sourceSite: 'https://user.kinogo.mu/'
              },
              {
                id: 'lordfilm-hub',
                title: 'Lordfilm Подборки (lordfilm.md)',
                year: 2026,
                genre: 'Сериалы и Фильмы',
                poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
                streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
                sourceSite: 'https://mg.lordfilm.md/podborki/'
              },
              {
                id: 'youtube-hd',
                title: 'YouTube Синхронный плеер',
                year: 2026,
                genre: 'YouTube Видео',
                poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
                streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
                sourceSite: 'https://www.youtube.com'
              }
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                  onCreateRoom(randomId);
                  onSelectMovie(m as Movie);
                }}
                className="group bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-indigo-500/50 shadow-lg flex flex-col"
              >
                <div className="aspect-[16/9] overflow-hidden relative bg-slate-800">
                  <img
                    src={m.poster}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-medium">
                      {m.genre}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1 group-hover:text-indigo-400 transition-colors">
                      {m.title}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400 mt-2 flex items-center space-x-1">
                    <Tv className="w-3.5 h-3.5" />
                    <span>Выбрать и смотреть вместе</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
