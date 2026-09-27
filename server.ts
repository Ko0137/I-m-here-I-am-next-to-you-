import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

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

// In-memory WebRTC Signal storage
const signalRooms = new Map<string, { offer?: any; answer?: any; candidates: any[] }>();

// API Signal Endpoint (same as requested)
app.post('/api/signal', (req, res) => {
  try {
    const { roomId, action, data } = req.body;

    if (!roomId) {
      return res.status(400).json({ success: false, error: 'roomId required' });
    }

    if (!signalRooms.has(roomId)) {
      signalRooms.set(roomId, { candidates: [] });
    }
    const room = signalRooms.get(roomId)!;

    if (action === 'offer') {
      room.offer = data;
      room.answer = undefined;
      room.candidates = [];
    } else if (action === 'answer') {
      room.answer = data;
    } else if (action === 'candidate') {
      room.candidates.push(data);
    } else if (action === 'get') {
      return res.json({
        offer: room.offer,
        answer: room.answer,
        candidates: room.candidates,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    return res.status(400).json({ success: false, error: 'Invalid request' });
  }
});

// Vite integration in dev mode
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
  console.log(`Telegram Watch Party server running on port ${PORT}`);
});
