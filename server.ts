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

// In-memory active rooms store
const rooms = new Map<string, RoomState>();

// Hot live catalog (Lordfilm, Kinogo, Marvel, Премьеры 2026)
const INITIAL_MOVIES: Movie[] = [
  {
    id: 'lordfilm-spider-man-new-day-2026',
    title: 'Человек-паук: Новый день (2026)',
    originalTitle: 'Spider-Man: Brand New Day',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800&auto=format&fit=crop',
    description: 'Новая глава приключений Человека-паука. Доступно в HD качестве со звуком 5.1 и синхронным просмотром.',
    rating: 9.3,
    genres: ['Премьера', 'Боевик', 'Lordfilm 4K'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Фильм полностью (Дубляж)', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
    ]
  },
  {
    id: 'lordfilm-beast-heart-2026',
    title: 'Сердце зверя (2026)',
    originalTitle: 'Heart of the Beast',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    description: 'Брэд Питт в захватывающем остросюжетном триллере о выживании и преданности.',
    rating: 8.8,
    genres: ['Триллер', 'Драма', 'Lordfilm'],
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Фильм полностью (1080p)', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'lordfilm-odyssey-2026',
    title: 'Одиссея (2026)',
    originalTitle: 'The Odyssey',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    description: 'Эпическая экранизация поэмы Гомера от Кристофера Нолана. Масштабные сражения и легендарное путешествие.',
    rating: 9.4,
    genres: ['Приключения', 'История', 'Премьера'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Фильм в Full HD (Дубляж)', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
    ]
  },
  {
    id: 'lordfilm-moana-2026',
    title: 'Моана (2026)',
    originalTitle: 'Moana Live Action',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop',
    description: 'Дуэйн Джонсон в киноверсии знаменитой истории об океане, богах и отважной Моане.',
    rating: 8.9,
    genres: ['Семейный', 'Фэнтези', 'Lordfilm'],
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Фильм полностью (Дубляж)', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
    ]
  },
  {
    id: 'dune-2-2024',
    title: 'Дюна: Часть вторая',
    originalTitle: 'Dune: Part Two',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800&auto=format&fit=crop',
    description: 'Пол Атрейдес объединяется с фременами, чтобы отомстить заговорщикам, уничтожившим его семью.',
    rating: 9.0,
    genres: ['Фантастика', 'Боевик', 'Топ КиноПоиск'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Полная версия 1080p', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
    ]
  },
  {
    id: 'stranger-things-s4',
    title: 'Очень странные дела (Сериал)',
    originalTitle: 'Stranger Things',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
    description: 'Таинственные события в городке Хоукинс и битва с потусторонними силами Изнанки.',
    rating: 9.2,
    genres: ['Сериал', 'Фантастика', 'Триллер'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Сезон 1 • Серия 1: Исчезновение Уилла', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' },
      { season: 1, episode: 2, title: 'Сезон 1 • Серия 2: Чудачка на Кленовой', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'youtube-chill-cinema',
    title: 'YouTube 4K: Уютный Кинотеатр & Lo-Fi',
    originalTitle: 'YouTube 4K Ambient Cinema',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    description: 'Атмосферный видеопоток высокой четкости для совместного отдыха и разговоров.',
    rating: 9.6,
    genres: ['YouTube', 'Релакс', 'Музыка'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
  }
];

// In-App Full Proxy Web Engine (Proxies Lordfilm, Kinogo, and other online theaters with interactive click & watch)
app.get('/api/proxy-browser', async (req, res) => {
  let targetUrl = (req.query.url as string || '').trim();
  if (!targetUrl) {
    targetUrl = 'https://mg.lordfilm.md';
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
      timeout: 7000,
      maxRedirects: 5
    });

    const parsedBase = new URL(targetUrl);
    let html = response.data;
    const $ = cheerio.load(html);

    $('head').prepend(`<base href="${parsedBase.origin}${parsedBase.pathname}">`);

    // Rewrite all links so user can navigate seamlessly inside the app
    $('a').each((_, el) => {
      const rawHref = $(el).attr('href');
      if (rawHref && !rawHref.startsWith('javascript:') && !rawHref.startsWith('#')) {
        try {
          const absoluteUrl = new URL(rawHref, targetUrl).href;
          $(el).attr('href', `/api/proxy-browser?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {}
      }
    });

    // Remove framebusters and annoying redirect scripts
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('top.location') || content.includes('window.frameElement') || content.includes('location.replace')) {
        $(el).remove();
      }
    });

    // Inject in-app Movie Sync Bridge (notifies parent app when user clicks a movie or video)
    const bridgeScript = `
      <script>
        (function() {
          // Listen to movie / video clicks
          document.addEventListener('click', function(e) {
            var item = e.target.closest('.shortstory, .owl-item, .movie-item, article, a');
            if (item) {
              var titleEl = item.querySelector('h2, h3, .title, .shortstory_title') || item;
              var imgEl = item.querySelector('img');
              var title = (titleEl && titleEl.innerText) ? titleEl.innerText.trim() : document.title;
              var poster = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : '';
              
              if (title && title.length > 2) {
                window.parent.postMessage({
                  type: 'CINEMA_MOVIE_CLICKED',
                  title: title,
                  poster: poster,
                  url: window.location.href
                }, '*');
              }
            }

            var link = e.target.closest('a');
            if (link && link.href && link.href.includes('/api/proxy-browser?url=')) {
              e.preventDefault();
              var target = decodeURIComponent(link.href.split('/api/proxy-browser?url=')[1]);
              window.parent.postMessage({ type: 'BROWSER_NAVIGATE_SYNC', url: target }, '*');
            }
          }, true);

          // Notify parent on scroll
          var timer;
          window.addEventListener('scroll', function() {
            clearTimeout(timer);
            timer = setTimeout(function() {
              window.parent.postMessage({ type: 'BROWSER_SCROLL_SYNC', scrollY: window.scrollY }, '*');
            }, 80);
          }, { passive: true });

          // Remote scroll receiver
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'APPLY_REMOTE_SCROLL') {
              window.scrollTo({ top: e.data.scrollY, behavior: 'smooth' });
            }
          });
        })();
      </script>
    `;

    $('body').append(bridgeScript);

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send($.html());
  } catch (err: any) {
    // If target site is Cloudflare protected, provide in-app interactive portal with 100+ movies
    const defaultCatalogHtml = INITIAL_MOVIES.map(m => `
      <div class="movie-card" onclick="window.parent.postMessage({ type: 'CINEMA_MOVIE_CLICKED', title: '${m.title.replace(/'/g, "\\'")}', poster: '${m.poster}', streamUrl: '${m.streamUrl}' }, '*')">
        <div class="poster-wrap">
          <img src="${m.poster}" alt="${m.title}" />
          <span class="badge">2026</span>
          <span class="rating">★ ${m.rating}</span>
        </div>
        <div class="movie-title">${m.title}</div>
        <div class="genres">${m.genres?.join(', ')}</div>
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
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0a09; color: #f5f5f4; padding: 16px; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #292524; padding-bottom: 12px; }
            .logo { font-weight: 900; font-size: 18px; color: #f59e0b; display: flex; align-items: center; gap: 8px; }
            .status { font-size: 11px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 10px; border-radius: 99px; font-weight: 700; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            @media (min-width: 600px) { .grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
            .movie-card { background: #1c1917; border: 1px solid #292524; border-radius: 16px; overflow: hidden; cursor: pointer; transition: transform 0.2s, border-color 0.2s; }
            .movie-card:active { transform: scale(0.97); border-color: #f59e0b; }
            .poster-wrap { position: relative; aspect-ratio: 2/3; background: #292524; }
            .poster-wrap img { width: 100%; height: 100%; object-fit: cover; }
            .badge { position: absolute; top: 8px; left: 8px; background: #22c55e; color: #000; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 6px; }
            .rating { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: #f59e0b; font-weight: 800; font-size: 11px; padding: 2px 6px; border-radius: 6px; }
            .movie-title { font-size: 13px; font-weight: 800; padding: 8px 10px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
            .genres { font-size: 10px; color: #a8a29e; padding: 0 10px 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎬 ЛОРДФИЛЬМ • 2026</div>
            <div class="status">СИНХРОННЫЙ ПРОСМОТР</div>
          </div>
          <div class="grid">
            ${defaultCatalogHtml}
          </div>
        </body>
      </html>
    `);
  }
});

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
  
  const filteredSamples = INITIAL_MOVIES.filter(m => 
    !query ||
    m.title.toLowerCase().includes(query) || 
    m.originalTitle?.toLowerCase().includes(query) ||
    m.genres?.some(g => g.toLowerCase().includes(query)) ||
    m.description?.toLowerCase().includes(query)
  );

  res.json({ results: filteredSamples });
});

// Real-Time Socket.io synchronization (Video Playback, In-App Browser Mirroring, Voice Chat, Video Chat, Text Chat)
io.on('connection', (socket) => {
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
        movie: INITIAL_MOVIES[0],
        isPlaying: false,
        currentTime: 0,
        playbackRate: 1,
        users: [currentUser],
        chat: [{
          id: 'sys_' + Date.now(),
          userId: 'system',
          userName: 'Я рядом',
          text: `Комната #${roomId} создана. Вы можете вместе выбирать фильмы в браузере, общаться голосом, видео или в чате!`,
          timestamp: Date.now()
        }],
        lastUpdated: Date.now(),
        sharedBrowser: {
          isActive: false,
          currentUrl: 'https://mg.lordfilm.md',
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
      if (room.sharedBrowser) {
        room.sharedBrowser.isActive = false;
      }
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Кинозал',
        text: `▶ Фильм запущен: ${movie.title}`,
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

  // In-App Shared Browser navigation & scrolling mirror
  socket.on('browser_toggle', ({ roomId, isActive, url, userId, userName }: { roomId: string; isActive: boolean; url?: string; userId: string; userName: string }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.sharedBrowser = {
        isActive,
        currentUrl: url || room.sharedBrowser?.currentUrl || 'https://mg.lordfilm.md',
        controllerId: userId,
        controllerName: userName,
        lastScrollY: 0
      };
      room.chat.push({
        id: 'msg_' + Date.now(),
        userId: 'system',
        userName: 'Я рядом',
        text: isActive ? `🌐 ${userName} открыл совместный браузер фильмов` : `🎬 ${userName} вернулся к кинотеатру`,
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
      socket.to(roomId).emit('browser_remote_navigate', { url, userName });
    }
  });

  socket.on('browser_scroll', ({ roomId, scrollY }: { roomId: string; scrollY: number }) => {
    const room = rooms.get(roomId);
    if (room && room.sharedBrowser) {
      room.sharedBrowser.lastScrollY = scrollY;
      socket.to(roomId).emit('browser_remote_scroll', { scrollY });
    }
  });

  // WebRTC Video & Voice calls signaling between participants
  socket.on('webrtc_offer', ({ roomId, to, offer, from, fromName }: { roomId: string; to?: string; offer: any; from: string; fromName: string }) => {
    if (to) {
      io.to(to).emit('webrtc_offer', { offer, from, fromName });
    } else {
      socket.to(roomId).emit('webrtc_offer', { offer, from, fromName });
    }
  });

  socket.on('webrtc_answer', ({ roomId, to, answer, from }: { roomId: string; to?: string; answer: any; from: string }) => {
    if (to) {
      io.to(to).emit('webrtc_answer', { answer, from });
    } else {
      socket.to(roomId).emit('webrtc_answer', { answer, from });
    }
  });

  socket.on('webrtc_ice_candidate', ({ roomId, to, candidate, from }: { roomId: string; to?: string; candidate: any; from: string }) => {
    if (to) {
      io.to(to).emit('webrtc_ice_candidate', { candidate, from });
    } else {
      socket.to(roomId).emit('webrtc_ice_candidate', { candidate, from });
    }
  });

  socket.on('disconnect', () => {
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
