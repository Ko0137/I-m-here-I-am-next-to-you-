import React from 'react';
import { Movie } from '../types';
import { CreateRoomButton } from './buttons/CreateRoomButton';
import { JoinRoomButton } from './buttons/JoinRoomButton';
import { Play, Flame, Radio, Popcorn, Heart, Globe, MessageSquare, Video, Mic } from 'lucide-react';

interface HomeProps {
  onCreateRoom: (roomId: string, selectedMovie?: Movie) => void;
  onJoinRoom: (roomId: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onCreateRoom, onJoinRoom }) => {
  const hotMovies: Movie[] = [
    {
      id: 'lordfilm-spider-man-new-day-2026',
      title: 'Человек-паук: Новый день (2026)',
      originalTitle: 'Spider-Man: Brand New Day',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
      description: 'Горячая премьера из базы Lordfilm. Синхронное воспроизведение секунда в секунду для двоих.',
      rating: 9.3,
      genres: ['Премьера 2026', 'Боевик', 'Lordfilm HD'],
      streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
    },
    {
      id: 'lordfilm-beast-heart-2026',
      title: 'Сердце зверя (2026)',
      originalTitle: 'Heart of the Beast',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
      description: 'Брэд Питт в остросюжетном блокбастере о выживании. Отличный выбор для совместного вечера.',
      rating: 8.8,
      genres: ['Триллер', 'Драма', 'Lordfilm'],
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'lordfilm-odyssey-2026',
      title: 'Одиссея (2026)',
      originalTitle: 'The Odyssey',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
      description: 'Эпическая премьера Кристофера Нолана. Масштабное фэнтези в максимальном качестве.',
      rating: 9.4,
      genres: ['Приключения', 'История', 'Премьера'],
      streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
    },
    {
      id: 'lordfilm-moana-2026',
      title: 'Моана (2026)',
      originalTitle: 'Moana Live Action',
      year: 2026,
      poster: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
      description: 'Дуэйн Джонсон в яркой киноверсии любимой истории. Смотрите вместе с любимым человеком.',
      rating: 8.9,
      genres: ['Семейный', 'Фэнтези', 'Lordfilm'],
      streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
    }
  ];

  const handleCreateDefault = () => {
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onCreateRoom(randomId, hotMovies[0]);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 p-4 md:p-8 text-stone-100 selection:bg-amber-500 selection:text-stone-950">
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        
        {/* Romance / Long-Distance Co-Watch Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-stone-900 to-stone-950 border border-stone-800 p-6 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex items-center space-x-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-400">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>Я РЯДОМ • СМОТРИТЕ КИНО ВМЕСТЕ НА РАССТОЯНИИ</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
              Смотрите любые фильмы <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">вместе внутри приложения</span>
            </h1>

            <p className="text-stone-300 text-sm md:text-base leading-relaxed max-w-xl">
              Вы в Астане, ваша половинка в России — заходите в одну комнату, выбирайте фильмы на сайтах прямо в приложении и общайтесь в чате, голосом или по видеосвязи.
            </p>

            {/* Main Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <CreateRoomButton onClick={handleCreateDefault} />
              <div className="flex-1 sm:max-w-xs">
                <JoinRoomButton onJoin={onJoinRoom} />
              </div>
            </div>
          </div>
        </div>

        {/* 3 Communication Types Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-stone-900/60 border border-stone-800/80 p-5 flex items-start space-x-3.5">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">Совместный браузер Lordfilm & Kinogo</h3>
              <p className="text-xs text-stone-400 mt-1">Один листает сайт или тыкает фильм — у второго фильм сразу включается.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-900/60 border border-stone-800/80 p-5 flex items-start space-x-3.5">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">3 вида общения одновременно</h3>
              <p className="text-xs text-stone-400 mt-1">Текстовый чат, голосовая связь без задержек и видеокамера прямо поверх фильма.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-900/60 border border-stone-800/80 p-5 flex items-start space-x-3.5">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-stone-100">Синхронизация 1 в 1</h3>
              <p className="text-xs text-stone-400 mt-1">Пауза, перемотка и серии переключаются синхронно у обоих зрителей.</p>
            </div>
          </div>
        </div>

        {/* Hot Premiere Movies (Lordfilm 2026 Collection) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-bold text-stone-100 flex items-center space-x-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <span>Горячие премьеры Lordfilm (2026)</span>
            </h2>
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              Кликните, чтобы открыть комнату и смотреть вместе
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {hotMovies.map((movie) => {
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
                  className="group relative flex flex-col overflow-hidden rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-amber-500/50 active:scale-[0.98] transition-all cursor-pointer shadow-lg select-none"
                >
                  <div className="aspect-[2/3] overflow-hidden relative bg-stone-950">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent"></div>

                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-12 w-12 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transform group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-stone-950 ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1 rounded-md bg-emerald-500 text-stone-950 px-2 py-0.5 text-[10px] font-black">
                      <span>2026</span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1 rounded-full bg-stone-950/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-stone-800">
                      <span>★ {movie.rating}</span>
                    </div>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h3 className="font-extrabold text-white text-xs sm:text-sm group-hover:text-amber-400 transition-colors line-clamp-1">
                        {movie.title}
                      </h3>
                      <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                        {movie.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-bold text-amber-400">
                      <span>Смотреть вдвоем</span>
                      <Play className="w-3 h-3 fill-amber-400" />
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
