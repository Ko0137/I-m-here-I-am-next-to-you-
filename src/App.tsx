import React, { useEffect, useState } from 'react';
import { socketService } from './services/socket';
import { User, RoomState, Movie } from './types';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { VideoPlayer } from './components/VideoPlayer';
import { MovieSearch } from './components/MovieSearch';
import { ChatPanel } from './components/ChatPanel';
import axios from 'axios';

export default function App() {
  // Initialize user immediately with fallback so buttons never block
  const [user, setUser] = useState<User>({
    id: 'tg_' + Math.floor(Math.random() * 100000),
    name: 'Telegram User'
  });
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp SDK if available
    const twa = (window as any).Telegram?.WebApp;
    if (twa) {
      twa.ready();
      twa.expand();
      if (twa.setHeaderColor) {
        twa.setHeaderColor('#0f172a');
      }
      
      const initData = twa.initData;
      if (initData) {
        axios.post('/api/auth', { initData })
          .then((res) => {
            if (res.data?.success && res.data?.user) {
              const tgUser = res.data.user;
              setUser({
                id: String(tgUser.id || 'tg_' + Math.floor(Math.random() * 10000)),
                name: tgUser.first_name || tgUser.username || 'Telegram User',
                avatar: tgUser.photo_url
              });
            }
          })
          .catch(() => {});
      }
    }

    // Connect socket
    const s = socketService.connect();
    setSocket(s);

    s.on('room_state', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleCreateRoom = (roomId: string) => {
    if (!socket || !user) return;
    socket.emit('join_room', { roomId, user });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket || !user) return;
    socket.emit('join_room', { roomId, user });
  };

  const handleLeaveRoom = () => {
    setRoom(null);
  };

  const handleSelectMovie = (movie: Movie) => {
    if (!socket || !room) return;
    socket.emit('change_movie', { roomId: room.roomId, movie });
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !room || !user) return;
    socket.emit('send_message', {
      roomId: room.roomId,
      message: { userId: user.id, userName: user.name, text }
    });
  };

  const handleToggleMute = (isMuted: boolean) => {
    if (!socket || !room || !user) return;
    socket.emit('update_user_media', { roomId: room.roomId, userId: user.id, isMuted });
  };

  const handleToggleVideo = (isVideoOn: boolean) => {
    if (!socket || !room || !user) return;
    socket.emit('update_user_media', { roomId: room.roomId, userId: user.id, isVideoOn });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 font-sans">
      <Header
        user={user}
        room={room}
        onLeaveRoom={handleLeaveRoom}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {!room ? (
          <Home
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onSelectMovie={(movie) => {
              // Wait until room is created then set movie
              setTimeout(() => {
                if (room) handleSelectMovie(movie);
              }, 300);
            }}
          />
        ) : (
          <div className="flex-1 flex relative overflow-hidden">
            <VideoPlayer
              room={room}
              currentUser={user}
              socket={socket}
              onOpenChat={() => setIsChatOpen(!isChatOpen)}
              onOpenSearch={() => setIsSearchOpen(true)}
              onToggleMute={handleToggleMute}
              onToggleVideo={handleToggleVideo}
            />

            <ChatPanel
              messages={room.chat}
              currentUser={user}
              onSendMessage={handleSendMessage}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}

        {isSearchOpen && (
          <MovieSearch
            onSelectMovie={handleSelectMovie}
            onClose={() => setIsSearchOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
