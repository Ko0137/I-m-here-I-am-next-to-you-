import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import axios from 'axios';
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
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny (Sample HD)',
    originalTitle: 'Big Buck Bunny',
    year: 2008,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_Buck_Bunny_poster_big.jpg/800px-Big_Buck_Bunny_poster_big.jpg',
    description: 'A large and lovable rabbit deals with forest bullies in this classic open-source animated film.',
    rating: 8.5,
    genres: ['Animation', 'Comedy', 'Short'],
    streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Full Movie (Standard)', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' },
      { season: 1, episode: 2, title: 'Alternative Stream (HLS 4K/HD)', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel (Sci-Fi)',
    originalTitle: 'Tears of Steel',
    year: 2012,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Tears_of_steel_poster.jpg/800px-Tears_of_steel_poster.jpg',
    description: 'In a dystopian future, a group of warriors and scientists gather at the Old Amsterdam canal to stage a dangerous experiment.',
    rating: 8.1,
    genres: ['Sci-Fi', 'Action', 'Short'],
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Part 1: The Mission', streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8' }
    ]
  },
  {
    id: 'sintel',
    title: 'Sintel (Fantasy Adventure)',
    originalTitle: 'Sintel',
    year: 2010,
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Sintel_poster.jpg/800px-Sintel_poster.jpg',
    description: 'A lonely young woman, Sintel, helps and befriends a baby dragon, and embarks on an epic journey when it is taken away.',
    rating: 8.9,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    episodes: [
      { season: 1, episode: 1, title: 'Full Epic Movie', streamUrl: 'https://bitmovin-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
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

// API: Search movies / series
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string || '').toLowerCase().trim();
  
  // Filter sample movies
  let results = SAMPLE_MOVIES.filter(m => 
    m.title.toLowerCase().includes(query) || 
    m.genres?.some(g => g.toLowerCase().includes(query)) ||
    query === ''
  );

  // Optional: Try fetching from public video API or balancers if query is present
  if (query.length > 2) {
    try {
      // Example external search integration or simulation
      const searchRes = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=movie&limit=5`, { timeout: 3000 });
      if (searchRes.data && searchRes.data.results) {
        const externalMovies: Movie[] = searchRes.data.results.map((item: any) => ({
          id: `ext_${item.trackId}`,
          title: item.trackName,
          year: new Date(item.releaseDate).getFullYear(),
          poster: item.artworkUrl100?.replace('100x100', '600x600'),
          description: item.longDescription || item.shortDescription || 'No description available.',
          rating: Number((item.trackExplicitness === 'notExplicit' ? 8.0 : 7.5)),
          genres: [item.primaryGenreName],
          streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' // fallback stream for external mock search
        }));
        results = [...results, ...externalMovies];
      }
    } catch (err) {
      // Ignore external search failures and use local catalog
    }
  }

  res.json({ results });
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
