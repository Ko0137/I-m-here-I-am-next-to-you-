import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      const serverUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
      this.socket = io(serverUrl || '', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        secure: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        console.log('Connected to CineSync Socket server:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from CineSync Socket server');
      });
    }
    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
