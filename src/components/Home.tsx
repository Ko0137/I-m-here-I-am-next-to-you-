import React from 'react';
import { Movie } from '../types';
import { CreateRoomButton } from './buttons/CreateRoomButton';
import { JoinRoomButton } from './buttons/JoinRoomButton';
import { Play, Flame, Shield, Radio, Sparkles, Popcorn, Layers } from 'lucide-react';

interface HomeProps {
  onCreateRoom: (roomId: string, selectedMovie?: Movie) => void;
  onJoinRoom: (roomId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onCreateRoom, onJoinRoom }) => {
  const catalogs: Movie[] = [
    {
      id: 'kinogo-featured',
      title: 'Kinogo Каталог (kinogo.mu)',
      originalTitle: 'Kinogo HD Cinema',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
      description: 'Горячие премьеры фильмов и сериалов из базы Kinogo. Синхронное воспроизведение 1080p для всех друзей.',
      rating: 8.9,
      genres: ['Премьеры', 'Кинотеатр', 'Full HD'],
      streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
      episodes: [
        { season: 1, episode: 1, title: 'Серия 1: Премьерный показ 1080p', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' },
        { season: 1, episode: 2, title: 'Серия 2: Альтернативный поток UltraHD', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
      ]
    },
    {
      id: 'lordfilm-featured',
      title: 'Lordfilm Подборки (lordfilm.md)',
      originalTitle: 'Lordfilm Curated Collections',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
      description: 'Топ сериалов и фильмов с Lordfilm: смотрите любимые серии вместе с синхронной перемоткой и паузой.',
      rating: 9.1,
      genres: ['Сериалы', 'Топ рейтинги', 'Дубляж'],
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      episodes: [
        { season: 1, episode: 1, title: 'Серия 1: Старт совместного просмотра', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
      ]
    },
    {
      id: 'youtube-featured',
      title: 'YouTube Синхронный плеер',
      originalTitle: 'YouTube Shared Watch',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
      description: 'Любые видеоролики, шоу, подкасты и прямые эфиры с YouTube синхронно в одной комнате.',
      rating: 9.4,
      genres: ['YouTube', 'Шоу', 'Стримы'],
      streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
      episodes: [
        { season: 1, episode: 1, title: 'YouTube HD Видеопоток', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
      ]
    }
  ];

  const handleCreateDefault = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onCreateRoom(randomId, catalogs[0]);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 p-4 md:p-8 text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      <div className="max-w-5xl mx-auto space-y-10 pb-16">
        
        {/* Hero Section */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 p-6 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex items-center space-x-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Я РЯДОМ • СОВМЕСТНЫЙ ОНЛАЙН-КИНОТЕАТР</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Смотрите любимые фильмы <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">вместе на расстоянии</span>
            </h1>

            <p className="text-stone-300 text-sm md:text-base leading-relaxed max-w-xl">
              Синхронизация воспроизведения секунда в секунду, голосовое общение без лагов и текстовый чат прямо в Telegram.
            </p>

            {/* Main Action Bar with modular buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <CreateRoomButton onClick={handleCreateDefault} />
              <div className="flex-1 sm:max-w-xs">
                <JoinRoomButton onJoin={onJoinRoom} />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-stone-900/60 border border-stone-800/80 p-5 flex items-start space-x-3.5 hover:border-amber-500/30 transition-colors">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">Мгновенная синхронизация</h3>
              <p className="text-xs text-stone-400 mt-1">Пауза, play и перемотка срабатывают одновременно у всех гостей.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-900/60 border border-stone-800/80 p-5 flex items-start space-x-3.5 hover:border-amber-500/30 transition-colors">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
              <Popcorn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">Каталоги Kinogo & Lordfilm</h3>
              <p className="text-xs text-stone-400 mt-1">Тысячи готовых фильмов и сериалов с возможностью поиска.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-900/60 border border-stone-800/80 p-5 flex items-start space-x-3.5 hover:border-amber-500/30 transition-colors">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">Без регистрации</h3>
              <p className="text-xs text-stone-400 mt-1">Заходите сразу через Telegram Mini App или любой браузер.</p>
            </div>
          </div>
        </div>

        {/* Catalogs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold text-stone-100 flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Популярные подборки и источники</span>
            </h2>
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              Кликните по любой карточке для мгновенного входа
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {catalogs.map((movie) => {
              const handleSelectCard = (e: React.SyntheticEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
                onCreateRoom(randomId, movie);
              };

              return (
                <div
                  key={movie.id}
                  onClick={handleSelectCard}
                  onTouchEnd={handleSelectCard}
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-amber-500/50 active:scale-[0.98] transition-all cursor-pointer shadow-lg hover:shadow-amber-500/5 select-none"
                >
                  <div className="aspect-[16/10] overflow-hidden relative bg-stone-950">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent"></div>

                    {/* Play Badge */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-stone-950 ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 flex items-center space-x-1.5 rounded-full bg-stone-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-amber-400 border border-stone-800">
                      <span>★ {movie.rating}</span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {movie.genres?.map((g, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-stone-800/80 px-2 py-0.5 text-[10px] font-medium text-stone-300"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                      <h3 className="font-extrabold text-white text-base group-hover:text-amber-400 transition-colors leading-snug">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                        {movie.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs font-bold text-amber-400">
                      <span>Открыть комнату</span>
                      <Play className="w-3.5 h-3.5 fill-amber-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
