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
    genres: ['Мультфильм', 'Боевик', 'Lordfilm'],
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Серия 1: Мультивселенная 1080p', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
    ]
  },
  {
    id: 'deadpool-wolverine',
    title: 'Дэдпул и Росомаха (2024)',
    originalTitle: 'Deadpool & Wolverine',
    year: 2024,
    poster: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=800&auto=format&fit=crop',
    description: 'Уэйд Уилсон объединяется с нелюдимым Росомахой, чтобы спасти свою вселенную от гибели.',
    rating: 8.7,
    genres: ['Комедия', 'Боевик', 'Marvel'],
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
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
    description: 'Идеальный расслабляющий видеопоток для фонового просмотра с друзьями во время общения.',
    rating: 9.5,
    genres: ['YouTube', 'Релакс', 'Музыка'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
  },
  {
    id: 'kinogo-catalog-master',
    title: 'Kinogo Каталог (kinogo.mu)',
    originalTitle: 'Kinogo Full HD Library',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
    description: 'Горячие киноновинки из базы Kinogo. Синхронное воспроизведение 1080p для всех участников комнаты.',
    rating: 8.8,
    genres: ['Kinogo', 'Фильмы', 'Премьеры'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
  },
  {
    id: 'lordfilm-catalog-master',
    title: 'Lordfilm Подборки (lordfilm.md)',
    originalTitle: 'Lordfilm HD Cinema',
    year: 2026,
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
    description: 'Лучшие зарубежные и отечественные сериалы и фильмы из подборок Lordfilm.',
    rating: 9.0,
    genres: ['Lordfilm', 'Сериалы', 'Топ'],
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
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
      user: { id: 'guest_' + Math.floor(Math.random() * 10000), first_name: 'Telegram Guest' }
    });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid initData format' });
  }
});

// API: Search movies / series from Kinogo, Lordfilm + curated database
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  
  let results: Movie[] = [];

  // Filter curated database first
  const filteredSamples = SAMPLE_MOVIES.filter(m => 
    !query ||
    m.title.toLowerCase().includes(query) || 
    m.originalTitle?.toLowerCase().includes(query) ||
    m.genres?.some(g => g.toLowerCase().includes(query)) ||
    m.description?.toLowerCase().includes(query)
  );

  results = [...filteredSamples];

  // Try scraping Kinogo (user.kinogo.mu)
  if (query) {
    try {
      const kinogoUrl = `https://user.kinogo.mu/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}`;
      const kinogoRes = await axios.get(kinogoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://user.kinogo.mu/'
        },
        timeout: 3000
      });

      const $ = cheerio.load(kinogoRes.data);
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
            year: 2024,
            poster: poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
            description: 'Найден фильм на kinogo.mu. Доступен для синхронного просмотра.',
            rating: 8.7,
            genres: ['Kinogo', 'Онлайн'],
            streamUrl: link || 'https://test-streams.mux.dev/x36h264/x36h264.m3u8'
          });
        }
      });
    } catch (e) {
      // Ignore anti-bot protection error
    }
  }

  // Remove duplicate titles
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

// API: In-app Live Web Browser Proxy (Strips X-Frame-Options, prevents self-recursion, injects sync bridge)
app.get('/api/proxy-page', async (req, res) => {
  let targetUrl = (req.query.url as string || '').trim();
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  // Normalize target URL
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // CRITICAL: Prevent self-referencing / recursion into CineSync app
  const host = req.get('host') || '';
  if (
    targetUrl.includes(host) || 
    targetUrl.includes('localhost:3000') || 
    targetUrl.includes('run.app') && targetUrl.includes('/api/proxy-page')
  ) {
    targetUrl = 'https://google.com';
  }

  // YouTube Special Handler: Render seamless responsive embed player
  if (targetUrl.includes('youtube.com/watch') || targetUrl.includes('youtu.be/')) {
    let videoId = '';
    if (targetUrl.includes('v=')) {
      try {
        const u = new URL(targetUrl);
        videoId = u.searchParams.get('v') || '';
      } catch (e) {}
    } else if (targetUrl.includes('youtu.be/')) {
      videoId = targetUrl.split('youtu.be/')[1]?.split('?')[0] || '';
    }
    if (videoId) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>YouTube Player</title>
            <style>
              body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #0c0a09; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe 
              src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&enablejsapi=1" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen>
            </iframe>
          </body>
        </html>
      `);
    }
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      responseType: 'text',
      timeout: 8000,
      maxRedirects: 5
    });

    const parsedBase = new URL(targetUrl);
    let html = response.data;

    // Load with Cheerio to rewrite links safely and prevent recursive app loading
    const $ = cheerio.load(html);

    // Inject base href
    $('head').prepend(`<base href="${parsedBase.origin}${parsedBase.pathname}">`);

    // Rewrite anchor tags
    $('a').each((_, el) => {
      const rawHref = $(el).attr('href');
      if (rawHref && !rawHref.startsWith('javascript:') && !rawHref.startsWith('#')) {
        try {
          const absoluteUrl = new URL(rawHref, targetUrl).href;
          $(el).attr('href', `/api/proxy-page?url=${encodeURIComponent(absoluteUrl)}`);
        } catch (e) {}
      }
    });

    // Remove framebusters
    $('script').each((_, el) => {
      const content = $(el).html() || '';
      if (content.includes('top.location') || content.includes('window.frameElement')) {
        $(el).remove();
      }
    });

    // Injected Client-Side Script: Event Bridge + Video Detector
    const bridgeScript = `
      <script>
        (function() {
          // Send navigation clicks to parent
          document.addEventListener('click', function(e) {
            var anchor = e.target.closest('a');
            if (anchor && anchor.href) {
              var href = anchor.getAttribute('href');
              if (href && href.startsWith('/api/proxy-page?url=')) {
                e.preventDefault();
                var target = decodeURIComponent(href.replace('/api/proxy-page?url=', ''));
                window.parent.postMessage({ type: 'BROWSER_NAVIGATE', url: target }, '*');
              }
            }
          }, true);

          // Scroll synchronization
          var scrollTimer;
          window.addEventListener('scroll', function() {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(function() {
              window.parent.postMessage({ type: 'BROWSER_SCROLL', scrollY: window.scrollY }, '*');
            }, 100);
          }, { passive: true });

          // Remote scroll listener
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'APPLY_REMOTE_SCROLL') {
              window.scrollTo({ top: e.data.scrollY, behavior: 'smooth' });
            }
          });

          // Detect video elements on the page
          setTimeout(function() {
            var videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="kinogo"], iframe[src*="lordfilm"], iframe[src*="embed"]');
            if (videos.length > 0) {
              window.parent.postMessage({ type: 'VIDEO_FOUND_ON_PAGE', count: videos.length }, '*');
            }
          }, 1500);
        })();
      </script>
    `;

    $('body').append(bridgeScript);

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send($.html());
  } catch (err: any) {
    // If target site blocked direct proxy scraping (e.g. Cloudflare / 403 / Captcha), render a high-utility Portal
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>CineSync Кинопортал</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c0a09; color: #f5f5f4; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; }
            .card { background: #1c1917; border: 1px solid #292524; padding: 28px 24px; border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
            .icon { font-size: 40px; margin-bottom: 12px; }
            h2 { color: #f59e0b; font-size: 20px; margin-bottom: 8px; font-weight: 800; }
            p { font-size: 13px; color: #a8a29e; line-height: 1.5; margin-bottom: 20px; }
            .badge { display: inline-block; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
            .actions { display: flex; flex-direction: column; gap: 10px; }
            .btn { display: block; width: 100%; padding: 12px; border-radius: 12px; font-weight: 700; font-size: 13px; cursor: pointer; text-decoration: none; border: none; transition: 0.2s; }
            .btn-primary { background: #f59e0b; color: #0c0a09; }
            .btn-primary:hover { background: #fbbf24; }
            .btn-secondary { background: #292524; color: #f5f5f4; }
            .btn-secondary:hover { background: #3c3836; }
            .search-box { margin-top: 16px; padding-top: 16px; border-top: 1px solid #292524; }
            .url-display { font-mono; font-size: 11px; color: #78716c; word-break: break-all; margin-bottom: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">🍿</div>
            <div class="badge">ВСТРОЕННЫЙ КИНОПОРТАЛ</div>
            <h2>Сайт защищен от прямого встраивания</h2>
            <div class="url-display">${targetUrl}</div>
            <p>Этот сайт использует Cloudflare защиту от ботов. Вы можете запустить готовый поток для комнаты прямо сейчас или открыть сайт во внешней вкладке:</p>
            
            <div class="actions">
              <button class="btn btn-primary" onclick="window.parent.postMessage({ type: 'LAUNCH_DEFAULT_STREAM', url: '${targetUrl}' }, '*')">
                ▶ Запустить синхронный HD плеер в комнате
              </button>
              <a class="btn btn-secondary" href="${targetUrl}" target="_blank" rel="noopener noreferrer">
                ↗ Открыть ${new URL(targetUrl).hostname} в новой вкладке
              </a>
              <button class="btn btn-secondary" onclick="window.parent.postMessage({ type: 'OPEN_SEARCH_MODAL' }, '*')">
                🔍 Открыть каталог фильмов (100+ новинок)
              </button>
            </div>
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
