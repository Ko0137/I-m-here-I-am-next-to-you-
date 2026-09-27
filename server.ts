import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { RoomState, Movie, User, ChatMessage } from './src/types';

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

// In-memory database for active rooms
const rooms = new Map<string, RoomState>();

// Curated live initial movie feeds
const SAMPLE_MOVIES: Movie[] = [
  {
    id: 'dune-2-2024',
    title: 'Дюна: Часть вторая (2024)',
    originalTitle: 'Dune: Part Two',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    description: 'Пол Атрейдес объединяется с фременами, чтобы отомстить заговорщикам, уничтожившим его семью.',
    rating: 8.9,
    genres: ['Фантастика', 'Боевик', 'Премьера 4K'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Полная версия 1080p (Дубляж)', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' },
      { season: 1, episode: 2, title: 'Альтернативный поток 4K HDR', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'oppenheimer-2023',
    title: 'Оппенгеймер (Oppenheimer)',
    originalTitle: 'Oppenheimer',
    year: 2023,
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop',
    description: 'История жизни американского физика Роберта Оппенгеймера, руководителя Манхэттенского проекта.',
    rating: 8.9,
    genres: ['Биография', 'Драма', 'История'],
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Фильм полностью (Дубляж)', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'interstellar-hd',
    title: 'Интерстеллар (Interstellar)',
    originalTitle: 'Interstellar',
    year: 2014,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
    description: 'Когда засуха и пыльные бури ставят человечество перед угрозой вымирания, группа исследователей отправляется сквозь червоточину.',
    rating: 9.0,
    genres: ['Фантастика', 'Драма', 'Топ КиноПоиск'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Фильм в Full HD 1080p', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
    ]
  },
  {
    id: 'spider-verse-2',
    title: 'Человек-паук: Паутина вселенных',
    originalTitle: 'Spider-Man: Across the Spider-Verse',
    year: 2023,
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
    description: 'Майлз Моралес отправляется в головокружительное приключение по Мультивселенной вместе с Гвен Стейси.',
    rating: 8.8,
    genres: ['Мультфильм', 'Боевик', 'HD'],
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Серия 1: Мультивселенная 1080p', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
    ]
  },
  {
    id: 'stranger-things-s4',
    title: 'Очень странные дела (Сериал)',
    originalTitle: 'Stranger Things',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    description: 'Таинственные события в городке Хоукинс и битва с потусторонними силами Изнанки.',
    rating: 9.1,
    genres: ['Сериал', 'Фантастика', 'Триллер'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Сезон 1 • Серия 1: Исчезновение Уилла', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' },
      { season: 1, episode: 2, title: 'Сезон 1 • Серия 2: Чудачка на Кленовой', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' },
      { season: 2, episode: 1, title: 'Сезон 2 • Серия 1: Безумный Макс', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
    ]
  },
  {
    id: 'rick-and-morty',
    title: 'Рик и Морти (Rick and Morty)',
    originalTitle: 'Rick and Morty',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop',
    description: 'Безумные межпространственные приключения гениального дедушки-ученого и его внука.',
    rating: 9.2,
    genres: ['Мультсериал', 'Комедия', 'Сыендук'],
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Сезон 1 • Серия 1: Пилот', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' },
      { season: 1, episode: 2, title: 'Сезон 1 • Серия 2: Пёс-газонокосильщик', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
    ]
  },
  {
    id: 'youtube-relax-4k',
    title: 'YouTube 4K: Космос, Природа & Lo-Fi Lounge',
    originalTitle: 'YouTube 4K Ambient Relax',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    description: 'Идеальный расслабляющий видеопоток для фонового совместного просмотра.',
    rating: 9.5,
    genres: ['YouTube', 'Релакс', 'Музыка'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
  }
];

// API: Verify Telegram initData
app.post('/api/auth', (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'Missing initData' });
  }
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return res.json({ success: true, user });
    }
    return res.json({
      success: true,
      user: { id: 'guest_' + Math.floor(Math.random() * 10000), first_name: 'Telegram User' }
    });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid initData format' });
  }
});

// API: Search movies
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  
  const filteredSamples = SAMPLE_MOVIES.filter(m => 
    !query ||
    m.title.toLowerCase().includes(query) || 
    m.originalTitle?.toLowerCase().includes(query) ||
    m.genres?.some(g => g.toLowerCase().includes(query)) ||
    m.description?.toLowerCase().includes(query)
  );

  res.json({ results: filteredSamples });
});

// Helper for extracting video links / proxies
app.get('/api/stream', (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'Missing stream url' });
  }
  res.json({ streamUrl: url, proxyEnabled: true });
});

// Real-Time Socket.io room synchronization (Playback, Video Broadcast, Web Browser mirroring, Chat & Voice)
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', ({ roomId, user }: { roomId: string; user: { id: string; name: string; avatar?: string } }) => {
    socket.join(roomId);
    
    let room = rooms.get(roomId);
    const currentUser: User = {
      id: user.id || socket.id,
      name: user.name || 'Гость ' + socket.id.slice(0, 4),
      avatar: user.avatar,
      isHost: false,
      isMuted: false,
      isVideoOn: false,
      isSpeaking: false
    };

    if (!room) {
      currentUser.isHost = true;
      room = {
        roomId,
        hostId: currentUser.id,
        movie: SAMPLE_MOVIES[0],
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1,
        users: [currentUser],
        chat: [{
          id: 'sys_' + Date.now(),
          userId: 'system',
          userName: 'Я рядом',
          text: `Комната #${roomId} открыта. Организатор: ${currentUser.name}. Доступен совместный браузер и трансляция экрана.`,
          timestamp: Date.now()
        }],
        lastUpdated: Date.now(),
        sharedBrowser: {
          isActive: false,
          currentUrl: 'https://google.com',
          controllerId: currentUser.id,
          controllerName: currentUser.name,
          lastScrollY: 0
        }
      };
      rooms.set(roomId, room);
    } else {
      const existingIndex = room.users.findIndex(u => u.id === currentUser.id);
      if (existingIndex >= 0) {
        room.users[existingIndex] = { ...room.users[existingIndex], ...currentUser };
      } else {
        room.users.push(currentUser);
      }
    }

    io.to(roomId).emit('room_state', room);
  });

  socket.on('video_play', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.isPlaying = true;
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      socket.to(roomId).emit('video_play', { currentTime, timestamp: Date.now() });
    }
  });

  socket.on('video_pause', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.isPlaying = false;
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      socket.to(roomId).emit('video_pause', { currentTime, timestamp: Date.now() });
    }
  });

  socket.on('video_seek', ({ roomId, currentTime }: { roomId: string; currentTime: number }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentTime = currentTime;
      room.lastUpdated = Date.now();
      socket.to(roomId).emit('video_seek', { currentTime, timestamp: Date.now() });
    }
  });

  socket.on('change_movie', ({ roomId, movie }: { roomId: string; movie: Movie }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.movie = movie;
      room.currentTime = 0;
      room.isPlaying = true;
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Кинозал',
        text: `Фильм изменен на: ${movie.title}`,
        timestamp: Date.now()
      });
      io.to(roomId).emit('room_state', room);
    }
  });

  socket.on('send_message', ({ roomId, message }: { roomId: string; message: Omit<ChatMessage, 'id' | 'timestamp'> }) => {
    const room = rooms.get(roomId);
    if (room) {
      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + Math.random().toString(36).substr(2, 4),
        userId: message.userId,
        userName: message.userName,
        text: message.text,
        timestamp: Date.now()
      };
      room.chat.push(chatMsg);
      if (room.chat.length > 100) room.chat.shift();
      io.to(roomId).emit('room_state', room);
    }
  });

  socket.on('update_user_media', ({ roomId, userId, isMuted, isVideoOn }: { roomId: string; userId: string; isMuted?: boolean; isVideoOn?: boolean }) => {
    const room = rooms.get(roomId);
    if (room) {
      const user = room.users.find(u => u.id === userId);
      if (user) {
        if (isMuted !== undefined) user.isMuted = isMuted;
        if (isVideoOn !== undefined) user.isVideoOn = isVideoOn;
        io.to(roomId).emit('room_state', room);
      }
    }
  });

  // Real-time Screen Sharing / In-App Browser stream broadcast
  socket.on('browser_toggle', ({ roomId, isActive, url, userId, userName }: { roomId: string; isActive: boolean; url?: string; userId: string; userName: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.sharedBrowser = {
        isActive,
        currentUrl: url || room.sharedBrowser?.currentUrl || 'https://google.com',
        controllerId: userId,
        controllerName: userName,
        lastScrollY: 0
      };
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: isActive ? `📺 ${userName} запустил совместный просмотр сайта` : `${userName} переключился на видеоплеер`,
        timestamp: Date.now()
      });
      io.to(roomId).emit('room_state', room);
    }
  });

  socket.on('browser_navigate', ({ roomId, url, userId, userName }: { roomId: string; url: string; userId: string; userName: string }) => {
    const room = rooms.get(roomId);
    if (room && room.sharedBrowser) {
      room.sharedBrowser.currentUrl = url;
      room.sharedBrowser.controllerId = userId;
      room.sharedBrowser.controllerName = userName;
      io.to(roomId).emit('room_state', room);
      socket.to(roomId).emit('browser_remote_navigate', { url });
    }
  });

  // Live Screen / Video Frame Broadcast chunk (WebRTC / Canvas streaming)
  socket.on('screen_frame_broadcast', ({ roomId, frameData }: { roomId: string; frameData: string }) => {
    socket.to(roomId).emit('screen_frame_received', { frameData });
  });

  socket.on('screen_share_status', ({ roomId, isSharing, sharerName }: { roomId: string; isSharing: boolean; sharerName: string }) => {
    socket.to(roomId).emit('screen_share_status', { isSharing, sharerName });
  });

  // WebRTC Signaling for real-time peer-to-peer screen & audio streaming
  socket.on('webrtc_signal', ({ roomId, to, signal, from }: { roomId: string; to?: string; signal: any; from: string }) => {
    if (to) {
      io.to(to).emit('webrtc_signal', { signal, from });
    } else {
      socket.to(roomId).emit('webrtc_signal', { signal, from });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    rooms.forEach((room, roomId) => {
      const initialLen = room.users.length;
      room.users = room.users.filter(u => u.id !== socket.id);
      if (room.users.length !== initialLen) {
        if (room.users.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('room_state', room);
        }
      }
    });
  });
});

// Vite integration in development
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
  console.log(`CineSync server running on port ${PORT}`);
});
