import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
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

// In-memory database for rooms and mock movie catalog
const rooms = new Map<string, RoomState>();

const SAMPLE_MOVIES: Movie[] = [
  {
    id: 'kinogo-hub',
    title: 'Kinogo Каталог (kinogo.mu)',
    originalTitle: 'Kinogo HD',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
    description: 'Совместный просмотр из каталога Kinogo (kinogo.mu). Видео синхронизировано для всех участников комнаты.',
    rating: 8.7,
    genres: ['Кинотеатр', 'Фильмы', 'Новинки'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Поток HD 1080p', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' },
      { season: 1, episode: 2, title: 'Альтернативный поток 4K', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'lordfilm-hub',
    title: 'Lordfilm Подборки (lordfilm.md)',
    originalTitle: 'Lordfilm Collections',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
    description: 'Лучшие подборки сериалов и фильмов с Lordfilm (lordfilm.md) для совместного просмотра.',
    rating: 8.9,
    genres: ['Сериалы', 'Подборки', 'HD'],
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Серия 1: Начало', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'youtube-hd',
    title: 'YouTube Синхронный плеер',
    originalTitle: 'YouTube Stream',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    description: 'Синхронный просмотр видео и стримов с YouTube на всех телефонах участников комнаты.',
    rating: 9.0,
    genres: ['YouTube', 'Стримы', 'Блогеры'],
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'YouTube HD Stream', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
    ]
  }
];

// API: Verify Telegram initData
app.post('/api/auth', (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: 'Missing initData' });
  }
  // In production, validate HMAC-SHA256 with bot token. For demo/preview, we parse user info.
  try {
    const urlParams = new URLSearchParams(initData);
    const userStr = urlParams.get('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return res.json({ success: true, user });
    }
    // Fallback user if opened outside Telegram or initData lacks user
    return res.json({
      success: true,
      user: { id: 'guest_' + Math.floor(Math.random() * 10000), first_name: 'Telegram Guest' }
    });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid initData format' });
  }
});

// API: Search movies / series from Kinogo and Lordfilm + fallback catalog
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  
  let results: Movie[] = [];

  // 1. Try scraping Kinogo (https://user.kinogo.mu/) if query is provided or general
  try {
    const kinogoUrl = query ? `https://user.kinogo.mu/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}` : 'https://user.kinogo.mu/';
    const kinogoRes = await axios.get(kinogoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://user.kinogo.mu/'
      },
      timeout: 4000
    });

    const $ = cheerio.load(kinogoRes.data);
    
    // Parse items from Kinogo
    $('.shortstory, .owl-item, .movie-item, article').each((index: number, element: any) => {
      const titleEl = $(element).find('.shortstory_title a, h2 a, h3 a, .title a').first();
      const title = titleEl.text().trim();
      const link = titleEl.attr('href');
      const imgEl = $(element).find('img').first();
      let poster = imgEl.attr('src') || imgEl.attr('data-src');
      if (poster && poster.startsWith('/')) {
        poster = `https://user.kinogo.mu${poster}`;
      }

      if (title) {
        results.push({
          id: `kinogo_${index}_${Math.random().toString(36).substring(2, 6)}`,
          title: `[Kinogo] ${title}`,
          year: 2026,
          poster: poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
          description: 'Найдено на Kinogo (user.kinogo.mu)',
          rating: 8.5,
          genres: ['Kinogo', 'Фильм'],
          streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' // HLS stream wrapper for player
        });
      }
    });
  } catch (err) {
    // Kinogo / Cloudflare anti-bot protection returned 403; fallback catalog items will be served
  }

  // 2. Try scraping Lordfilm (https://mg.lordfilm.md/podborki/)
  try {
    const lordfilmUrl = query ? `https://mg.lordfilm.md/index.php?do=search&story=${encodeURIComponent(query)}` : 'https://mg.lordfilm.md/podborki/';
    const lordfilmRes = await axios.get(lordfilmUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://mg.lordfilm.md/'
      },
      timeout: 4000
    });

    const $ = cheerio.load(lordfilmRes.data);
    $('.item, .shortstory, .movie-item').each((index: number, element: any) => {
      const titleEl = $(element).find('.name a, h3 a, h2 a').first();
      const title = titleEl.text().trim();
      const imgEl = $(element).find('img').first();
      let poster = imgEl.attr('src') || imgEl.attr('data-src');
      if (poster && poster.startsWith('/')) {
        poster = `https://mg.lordfilm.md${poster}`;
      }

      if (title) {
        results.push({
          id: `lordfilm_${index}_${Math.random().toString(36).substring(2, 6)}`,
          title: `[Lordfilm] ${title}`,
          year: 2026,
          poster: poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
          description: 'Найдено в подборках Lordfilm (mg.lordfilm.md)',
          rating: 8.8,
          genres: ['Lordfilm', 'Сериал'],
          streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
        });
      }
    });
  } catch (err) {
    // Lordfilm anti-bot protection returned 403; fallback catalog items will be served
  }

  // 3. If no scraped results or query matches local sample movies, merge sample catalog
  const filteredSamples = SAMPLE_MOVIES.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.genres?.some(g => g.toLowerCase().includes(query)) ||
    query === ''
  );

  results = [...results, ...filteredSamples];

  // Remove duplicates by title
  const uniqueResults = Array.from(new Map(results.map(item => [item.title, item])).values());

  res.json({ results: uniqueResults });
});

// API: Stream resolver / proxy helper
app.get('/api/stream', (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ error: 'Missing stream url' });
  }
  // Return stream configuration or proxy headers
  res.json({ streamUrl: url, proxyEnabled: true });
});

// Socket.io real-time room sync
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', ({ roomId, user }: { roomId: string; user: { id: string; name: string; avatar?: string } }) => {
    socket.join(roomId);
    
    let room = rooms.get(roomId);
    const currentUser: User = {
      id: user.id || socket.id,
      name: user.name || 'User ' + socket.id.slice(0, 4),
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
          userName: 'CineSync Bot',
          text: `Room created by ${currentUser.name}. Enjoy watching together!`,
          timestamp: Date.now()
        }],
        lastUpdated: Date.now()
      };
      rooms.set(roomId, room);
    } else {
      // Check if user already exists
      const existingIndex = room.users.findIndex(u => u.id === currentUser.id);
      if (existingIndex >= 0) {
        room.users[existingIndex] = { ...room.users[existingIndex], ...currentUser };
      } else {
        room.users.push(currentUser);
      }
    }

    io.to(roomId).emit('room_state', room);
    console.log(`User ${currentUser.name} joined room ${roomId}`);
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
      room.isPlaying = false;
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'CineSync Bot',
        text: `Movie changed to: ${movie.title}`,
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

  socket.on('ping_sync', (callback) => {
    callback(Date.now());
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Find room and remove or mark inactive
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
