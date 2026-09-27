import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
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

// Base fallback library
const BASE_MOVIES: MovieItem[] = [
  {
    id: 'spider-man-2026',
    title: 'Человек-паук: Новый день (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
    rating: 9.4,
    genres: ['Премьера 2026', 'Боевик'],
    description: 'Масштабная премьера 2026 года. Синхронный просмотр в Full HD качестве.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
  },
  {
    id: 'beast-heart-2026',
    title: 'Сердце зверя (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    rating: 8.9,
    genres: ['Триллер', 'Драма'],
    description: 'Брэд Питт в остросюжетном блокбастере о выживании и опасности в дикой природе.',
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
  },
  {
    id: 'odyssey-2026',
    title: 'Одиссея (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    rating: 9.5,
    genres: ['Приключения', 'История'],
    description: 'Экранизация поэмы Гомера от Кристофера Нолана. Полный дубляж.',
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
  },
  {
    id: 'moana-2026',
    title: 'Моана (2026)',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    rating: 9.0,
    genres: ['Семейный', 'Фэнтези'],
    description: 'Дуэйн Джонсон в яркой киноверсии знаменитой истории об океане и богах.',
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8'
  }
];

// LIVE PROXY ENGINE: Renders real websites (Kinogo, Lordfilm, YouTube, Google) inside the app with full clickable navigation
app.get('/api/live-site', async (req, res) => {
  let targetUrl = (req.query.url as string || '').trim();
  if (!targetUrl) {
    targetUrl = 'https://user.kinogo.mu';
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      responseType: 'text',
      timeout: 6000,
      maxRedirects: 5
    });

    const parsedBase = new URL(targetUrl);
    let html = response.data;
    const $ = cheerio.load(html);

    // Set origin base
    $('head').prepend(`<base href="${parsedBase.origin}${parsedBase.pathname}">`);

    // Rewrite anchor links to stay inside live proxy
    $('a').each((_, el) => {
      const rawHref = $(el).attr('href');
      if (rawHref && !rawHref.startsWith('javascript:') && !rawHref.startsWith('#')) {
        try {
          const absoluteUrl = new URL(rawHref, targetUrl).href;
          $(el).attr('href', `/api/live-site?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {}
      }
    });

    // Remove framebusters
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('top.location') || content.includes('window.frameElement') || content.includes('location.replace')) {
        $(el).remove();
      }
    });

    // Injected Sync & Movie detector script
    const syncScript = `
      <script>
        (function() {
          // Link clicks synchronization
          document.addEventListener('click', function(e) {
            var link = e.target.closest('a');
            if (link && link.href) {
              var href = link.getAttribute('href');
              if (href && href.startsWith('/api/live-site?url=')) {
                e.preventDefault();
                var target = decodeURIComponent(href.replace('/api/live-site?url=', ''));
                window.parent.postMessage({ type: 'SITE_NAVIGATE_EVENT', url: target }, '*');
              }
            }

            // Clicked a movie card / watch button
            var card = e.target.closest('.shortstory, .movie-item, article, [class*="film"], [class*="movie"]');
            if (card) {
              var titleEl = card.querySelector('h2, h3, .title, a') || card;
              var title = titleEl ? titleEl.innerText.trim() : document.title;
              var img = card.querySelector('img');
              var poster = img ? (img.src || img.getAttribute('data-src')) : '';
              
              if (title && title.length > 2) {
                window.parent.postMessage({
                  type: 'MOVIE_CLICKED_EVENT',
                  title: title,
                  poster: poster,
                  url: window.location.href
                }, '*');
              }
            }
          }, true);

          // Scroll synchronization
          var scrollTimeout;
          window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
              window.parent.postMessage({ type: 'SITE_SCROLL_EVENT', scrollY: window.scrollY }, '*');
            }, 60);
          }, { passive: true });

          // Remote scroll listener
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'REMOTE_SCROLL_ACTION') {
              window.scrollTo({ top: e.data.scrollY, behavior: 'smooth' });
            }
          });
        })();
      </script>
    `;

    $('body').append(syncScript);

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send($.html());
  } catch (err: any) {
    // If target site returns 403 / Cloudflare captcha, render live responsive fallback catalog with real search
    const catalogCards = BASE_MOVIES.map(m => `
      <div class="card" onclick="window.parent.postMessage({ type: 'MOVIE_CLICKED_EVENT', title: '${m.title.replace(/'/g, "\\'")}', poster: '${m.poster}' }, '*')">
        <div class="poster"><img src="${m.poster}" alt="${m.title}" /><span class="badge">2026</span></div>
        <div class="title">${m.title}</div>
      </div>
    `).join('');

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, sans-serif; background: #09090b; color: #f4f4f5; padding: 12px; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 10px; margin-bottom: 12px; }
            .site-title { font-weight: 900; font-size: 16px; color: #f59e0b; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
            @media(min-width: 500px) { .grid { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
            .card { background: #18181b; border: 1px solid #27272a; border-radius: 14px; overflow: hidden; cursor: pointer; transition: 0.2s; }
            .card:active { transform: scale(0.96); border-color: #f59e0b; }
            .poster { position: relative; aspect-ratio: 2/3; background: #27272a; }
            .poster img { width: 100%; height: 100%; object-fit: cover; }
            .badge { position: absolute; top: 6px; left: 6px; background: #10b981; color: #000; font-weight: 900; font-size: 9px; padding: 2px 6px; border-radius: 4px; }
            .title { padding: 8px; font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="site-title">🍿 ${targetUrl.replace('https://', '').replace('http://', '')}</div>
            <span style="font-size: 10px; color: #10b981; font-weight: bold;">СИНХРОНИЗИРОВАНО</span>
          </div>
          <div class="grid">
            ${catalogCards}
          </div>
        </body>
      </html>
    `);
  }
});

// Socket.io Synchronized Co-Browsing & Video Playing
io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, user }: { roomId: string; user: { id: string; name: string; avatar?: string } }) => {
    socket.join(roomId);

    let room = rooms.get(roomId);
    const currentUser: User = {
      id: user.id || socket.id,
      name: user.name || 'Пользователь',
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
          text: `Комната #${roomId} открыта. Лазайте по сайтам вместе, выбирайте фильм и общайтесь!`,
          timestamp: Date.now()
        }],
        currentMovie: BASE_MOVIES[0],
        isPlaying: false,
        currentTime: 0,
        currentSite: 'https://user.kinogo.mu',
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

  // User navigates to any URL in the shared browser
  socket.on('browser_navigate', ({ roomId, url, userName }: { roomId: string; url: string; userName: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.currentSite = url;
      room.activeView = 'browser';
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: `🌐 ${userName} открыл страницу: ${url}`,
        timestamp: Date.now()
      });
      io.to(roomId).emit('room_state', room);
      socket.to(roomId).emit('remote_browser_navigate', { url });
    }
  });

  // User scrolls the page
  socket.on('browser_scroll', ({ roomId, scrollY }: { roomId: string; scrollY: number }) => {
    socket.to(roomId).emit('remote_browser_scroll', { scrollY });
  });

  // User selects a movie on the site
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
        text: `▶ ${userName} выбрал фильм «${movie.title}». Запускаем совместный просмотр!`,
        timestamp: Date.now()
      });
      io.to(roomId).emit('room_state', room);
    }
  });

  // Switch view between browser and player
  socket.on('view_change', ({ roomId, view }: { roomId: string; view: 'browser' | 'player' }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.activeView = view;
      io.to(roomId).emit('room_state', room);
    }
  });

  // Video playback events
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

  // User media
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
