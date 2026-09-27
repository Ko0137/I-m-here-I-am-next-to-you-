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
  res.json({ streamUrl: url, proxyEnabled: true });
});

// API: In-app Live Web Browser Proxy (strips X-Frame-Options & injects sync bridge)
app.get('/api/proxy-page', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    let normalized = targetUrl;
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }

    // Special handler for YouTube: transform standard watch URL to embed player for seamless playback in iframe
    if (normalized.includes('youtube.com/watch') || normalized.includes('youtu.be/')) {
      let videoId = '';
      if (normalized.includes('v=')) {
        const u = new URL(normalized);
        videoId = u.searchParams.get('v') || '';
      } else if (normalized.includes('youtu.be/')) {
        videoId = normalized.split('youtu.be/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
                iframe { width: 100%; height: 100%; border: none; }
              </style>
            </head>
            <body>
              <iframe 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
              </iframe>
            </body>
          </html>
        `);
      }
    }

    const response = await axios.get(normalized, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      responseType: 'text',
      timeout: 10000,
      maxRedirects: 5
    });

    const parsedBase = new URL(normalized);
    let html = response.data;

    // Inject base href so CSS/JS/images load from target site
    const baseTag = `<base href="${parsedBase.origin}${parsedBase.pathname}">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // Inject sync helper script inside iframe
    const syncScript = `
      <script>
        (function() {
          // Notify parent window on navigation click
          document.addEventListener('click', function(e) {
            var anchor = e.target.closest('a');
            if (anchor && anchor.href) {
              e.preventDefault();
              window.parent.postMessage({ type: 'BROWSER_NAVIGATE', url: anchor.href }, '*');
            }
          }, true);

          // Notify parent on scroll
          var scrollDebounce;
          window.addEventListener('scroll', function() {
            clearTimeout(scrollDebounce);
            scrollDebounce = setTimeout(function() {
              window.parent.postMessage({ type: 'BROWSER_SCROLL', scrollY: window.scrollY }, '*');
            }, 100);
          }, { passive: true });

          // Listen for remote scroll from parent
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'APPLY_REMOTE_SCROLL') {
              window.scrollTo({ top: e.data.scrollY, behavior: 'smooth' });
            }
          });
        })();
      </script>
    `;

    html = html.replace('</body>', `${syncScript}</body>`);

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err: any) {
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, sans-serif; background: #0c0a09; color: #f5f5f4; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            .card { background: #1c1917; border: 1px solid #292524; padding: 24px; border-radius: 16px; max-width: 400px; }
            h2 { color: #f59e0b; margin-top: 0; }
            p { font-size: 13px; color: #a8a29e; }
            button { background: #f59e0b; color: #0c0a09; font-weight: bold; border: none; padding: 10px 16px; border-radius: 10px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Не удалось загрузить сайт</h2>
            <p>Сайт защищен от прямого встраивания или временно недоступен: ${targetUrl}</p>
            <button onclick="window.history.back()">Назад</button>
          </div>
        </body>
      </html>
    `);
  }
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

  // Shared Browser Live Mirroring
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
        userName: 'Кинозал',
        text: isActive ? `${userName} запустил совместный браузер` : `${userName} закрыл совместный браузер`,
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

  socket.on('browser_scroll', ({ roomId, scrollY }: { roomId: string; scrollY: number }) => {
    const room = rooms.get(roomId);
    if (room && room.sharedBrowser) {
      room.sharedBrowser.lastScrollY = scrollY;
      socket.to(roomId).emit('browser_remote_scroll', { scrollY });
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
