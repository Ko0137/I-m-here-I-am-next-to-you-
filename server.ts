import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomState, MovieItem, User, ChatMessage } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// In-memory rooms
const rooms = new Map<string, RoomState>();

// Rich curated database covering Lordfilm, Kinogo, YouTube and Premiere movies
const MOVIE_CATALOG: MovieItem[] = [
  {
    id: 'lordfilm-spider-man-2026',
    title: 'Человек-паук: Новый день (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
    rating: 9.4,
    genres: ['Премьера 2026', 'Боевик', 'Marvel'],
    description: 'Масштабная премьера 2026 года на Lordfilm. Майлз и Питер Паркер в новой захватывающей главе.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    sourceSite: 'lordfilm'
  },
  {
    id: 'lordfilm-beast-heart-2026',
    title: 'Сердце зверя (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    rating: 8.9,
    genres: ['Триллер', 'Драма', 'Lordfilm'],
    description: 'Брэд Питт в остросюжетном блокбастере о выживании и опасности в дикой природе.',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    sourceSite: 'lordfilm'
  },
  {
    id: 'lordfilm-odyssey-2026',
    title: 'Одиссея (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    rating: 9.5,
    genres: ['Приключения', 'История', 'Премьера'],
    description: 'Экранизация поэмы Гомера от Кристофера Нолана. Полный дубляж в Ultra HD качестве.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    sourceSite: 'lordfilm'
  },
  {
    id: 'lordfilm-moana-2026',
    title: 'Моана (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    rating: 9.0,
    genres: ['Семейный', 'Фэнтези', 'Lordfilm'],
    description: 'Дуэйн Джонсон в яркой киноверсии знаменитой истории об океане и богах.',
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    sourceSite: 'lordfilm'
  },
  {
    id: 'kinogo-dune-2',
    title: 'Дюна: Часть вторая (Kinogo)',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop',
    rating: 9.1,
    genres: ['Фантастика', 'Боевик', 'Kinogo HD'],
    description: 'Пол Атрейдес объединяется с фременами, чтобы спасти будущее вселенной.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    sourceSite: 'kinogo'
  },
  {
    id: 'kinogo-oppenheimer',
    title: 'Оппенгеймер (Kinogo)',
    year: 2023,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
    rating: 8.9,
    genres: ['Биография', 'Драма', 'Kinogo HD'],
    description: 'История создания Манхэттенского проекта от Кристофера Нолана.',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    sourceSite: 'kinogo'
  },
  {
    id: 'kinogo-stranger-things',
    title: 'Очень странные дела (Сериал)',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    rating: 9.3,
    genres: ['Сериал', 'Фантастика', 'Kinogo'],
    description: 'Таинственные события в городке Хоукинс и битва с потусторонними силами.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    sourceSite: 'kinogo'
  },
  {
    id: 'youtube-cinema-4k',
    title: 'YouTube 4K: Уютный Кинозал & Ambient Lounge',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    rating: 9.7,
    genres: ['YouTube', 'Релакс', 'Музыка'],
    description: 'Идеальный 4K видеоряд для совместного вечернего отдыха и разговоров.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    sourceSite: 'youtube'
  }
];

// Search & Catalog API
app.get('/api/movies', (req, res) => {
  const site = (req.query.site as string || '').toLowerCase();
  const q = (req.query.q as string || '').toLowerCase().trim();

  let list = MOVIE_CATALOG;
  if (site && site !== 'all') {
    list = list.filter(m => !m.sourceSite || m.sourceSite === site);
  }

  if (q) {
    list = list.filter(m => 
      m.title.toLowerCase().includes(q) ||
      m.genres?.some(g => g.toLowerCase().includes(q)) ||
      m.description?.toLowerCase().includes(q)
    );
  }

  res.json({ results: list });
});

// Socket.io Real-Time Synchronization
io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, user }: { roomId: string; user: { id: string; name: string; avatar?: string } }) => {
    socket.join(roomId);

    let room = rooms.get(roomId);
    const currentUser: User = {
      id: user.id || socket.id,
      name: user.name || 'Гость',
      avatar: user.avatar,
      isHost: false,
      isMuted: false,
      isVideoOn: false
    };

    if (!room) {
      currentUser.isHost = true;
      room = {
        roomId,
        hostId: currentUser.id,
        users: [currentUser],
        chat: [{
          id: 'sys_' + Date.now(),
          userId: 'system',
          userName: 'Я рядом',
          text: `Комната #${roomId} открыта. Выберите фильм в браузере или нажмите Play!`,
          timestamp: Date.now()
        }],
        currentMovie: MOVIE_CATALOG[0],
        isPlaying: false,
        currentTime: 0,
        currentSite: 'lordfilm',
        searchQuery: '',
        activeView: 'browser',
        lastUpdated: Date.now()
      };
      rooms.set(roomId, room);
    } else {
      const existingIdx = room.users.findIndex(u => u.id === currentUser.id);
      if (existingIdx >= 0) {
        room.users[existingIdx] = { ...room.users[existingIdx], ...currentUser };
      } else {
        room.users.push(currentUser);
      }
    }

    io.to(roomId).emit('room_state', room);
  });

  // Switch Site inside in-app browser (e.g. Lordfilm, Kinogo, YouTube)
  socket.on('site_change', ({ roomId, site, userName }: { roomId: string; site: string; userName: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentSite = site;
      room.searchQuery = '';
      room.activeView = 'browser';
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: `🌐 ${userName} переключил сайт на: ${site.toUpperCase()}`,
        timestamp: Date.now()
      });
      io.to(roomId).emit('room_state', room);
    }
  });

  // User types query in search bar (instant live sync)
  socket.on('search_input_sync', ({ roomId, query }: { roomId: string; query: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.searchQuery = query;
      socket.to(roomId).emit('search_input_sync', { query });
    }
  });

  // User clicks a movie on the site
  socket.on('movie_selected', ({ roomId, movie, userName }: { roomId: string; movie: MovieItem; userName: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentMovie = movie;
      room.isPlaying = true;
      room.currentTime = 0;
      room.activeView = 'player';
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: `▶ ${userName} выбрал фильм «${movie.title}». Начинаем просмотр!`,
        timestamp: Date.now()
      });
      io.to(roomId).emit('room_state', room);
    }
  });

  // Switch view between browser and player
  socket.on('view_change', ({ roomId, view, userName }: { roomId: string; view: 'browser' | 'player'; userName: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.activeView = view;
      io.to(roomId).emit('room_state', room);
    }
  });

  // Video playback sync
  socket.on('video_play', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.isPlaying = true;
      room.currentTime = currentTime;
      socket.to(roomId).emit('video_play', { currentTime });
    }
  });

  socket.on('video_pause', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.isPlaying = false;
      room.currentTime = currentTime;
      socket.to(roomId).emit('video_pause', { currentTime });
    }
  });

  socket.on('video_seek', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentTime = currentTime;
      socket.to(roomId).emit('video_seek', { currentTime });
    }
  });

  // Chat message
  socket.on('send_message', ({ roomId, message }: { roomId: string; message: Omit<ChatMessage, 'id' | 'timestamp'> }) => {
    const room = rooms.get(roomId);
    if (room) {
      const msg: ChatMessage = {
        id: 'msg_' + Date.now(),
        userId: message.userId,
        userName: message.userName,
        text: message.text,
        timestamp: Date.now()
      };
      room.chat.push(msg);
      if (room.chat.length > 100) room.chat.shift();
      io.to(roomId).emit('room_state', room);
    }
  });

  // User media (mic, video)
  socket.on('update_user_media', ({ roomId, userId, isMuted, isVideoOn }: { roomId: string; userId: string; isMuted?: boolean; isVideoOn?: boolean }) => {
    const room = rooms.get(roomId);
    if (room) {
      const u = room.users.find(x => x.id === userId);
      if (u) {
        if (isMuted !== undefined) u.isMuted = isMuted;
        if (isVideoOn !== undefined) u.isVideoOn = isVideoOn;
        io.to(roomId).emit('room_state', room);
      }
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, roomId) => {
      const prevLen = room.users.length;
      room.users = room.users.filter(u => u.id !== socket.id);
      if (room.users.length !== prevLen) {
        if (room.users.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('room_state', room);
        }
      }
    });
  });
});

// Vite middleware in dev
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' }
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
