import React, { useEffect, useState } from 'react';
import { socketService } from './services/socket';
import { User, RoomState, Movie } from './types';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { VideoPlayer } from './components/VideoPlayer';
import { MovieSearch } from './components/MovieSearch';
import { ChatPanel } from './components/ChatPanel';
import axios from 'axios';

const DEFAULT_MOVIE: Movie = {
  id: 'kinogo-hub',
  title: 'Kinogo Каталог (kinogo.mu)',
  originalTitle: 'Kinogo HD Library',
  year: 2026,
  poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&auto=format&fit=crop',
  description: 'Совместный просмотр новейших фильмов и сериалов из каталога Kinogo. Синхронизация для всех участников.',
  rating: 8.8,
  genres: ['Кинотеатр', 'Премьеры', 'HD'],
  streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
  episodes: [
    { season: 1, episode: 1, title: 'Серия 1: Full HD 1080p', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
  ]
};

export default function App() {
  const [user, setUser] = useState<User>({
    id: 'tg_' + Math.floor(Math.random() * 100000),
    name: 'Telegram User'
  });
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Centralized HapticFeedback controller & Event Delegation listener
  useEffect(() => {
    const twa = (window as any).Telegram?.WebApp;
    if (twa) {
      try {
        twa.ready();
        twa.expand();
        if (twa.setHeaderColor) {
          twa.setHeaderColor('#0f172a');
        }
        
        if (twa.initDataUnsafe?.user) {
          const u = twa.initDataUnsafe.user;
          setUser({
            id: String(u.id),
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Пользователь',
            avatar: u.photo_url
          });
        }
      } catch (err) {
        // ignore
      }
      
      if (twa.initData) {
        axios.post('/api/auth', { initData: twa.initData })
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

    const s = socketService.connect();
    setSocket(s);

    s.on('room_state', (updatedRoom: RoomState) => {
      setRoom(updatedRoom);
    });

    // Global Event Delegation & Centralized HapticFeedback
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement).closest('button, [role="button"], input, .group');
      if (target) {
        try {
          const t = (window as any).Telegram?.WebApp;
          if (t?.HapticFeedback) {
            t.HapticFeedback.impactOccurred('medium');
          }
        } catch (err) {
          // ignore
        }
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    window.addEventListener('touchend', handleGlobalClick, { capture: true });

    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      window.removeEventListener('touchend', handleGlobalClick, { capture: true });
      socketService.disconnect();
    };
  }, []);

  const handleCreateRoom = (roomId: string, chosenMovie?: Movie) => {
    const selectedMovie = chosenMovie || DEFAULT_MOVIE;
    const initialUser: User = {
      ...user,
      isHost: true,
      isMuted: false,
      isVideoOn: false,
      isSpeaking: false
    };

    // Optimistic instant local room state so UI transitions immediately without network delay
    setRoom({
      roomId,
      hostId: initialUser.id,
      movie: selectedMovie,
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      users: [initialUser],
      chat: [{
        id: 'sys_' + Date.now(),
        userId: 'system',
        userName: 'Система',
        text: `Комната ${roomId} создана. Приятного просмотра!`,
        timestamp: Date.now()
      }],
      lastUpdated: Date.now()
    });

    if (socket) {
      socket.emit('join_room', { roomId, user: initialUser });
      if (chosenMovie) {
        setTimeout(() => {
          socket.emit('change_movie', { roomId, movie: chosenMovie });
        }, 150);
      }
    }
  };

  const handleJoinRoom = (roomId: string) => {
    const initialUser: User = {
      ...user,
      isHost: false,
      isMuted: false,
      isVideoOn: false,
      isSpeaking: false
    };

    // Optimistic immediate entry
    setRoom({
      roomId,
      hostId: '',
      movie: DEFAULT_MOVIE,
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      users: [initialUser],
      chat: [{
        id: 'sys_' + Date.now(),
        userId: 'system',
        userName: 'Система',
        text: `Вход в комнату ${roomId}...`,
        timestamp: Date.now()
      }],
      lastUpdated: Date.now()
    });

    if (socket) {
      socket.emit('join_room', { roomId, user: initialUser });
    }
  };

  const handleLeaveRoom = () => {
    setRoom(null);
  };

  const handleSelectMovie = (movie: Movie) => {
    if (room) {
      setRoom({
        ...room,
        movie,
        lastUpdated: Date.now()
      });
    }
    if (socket && room) {
      socket.emit('change_movie', { roomId: room.roomId, movie });
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !room || !user) return;
    const newMsg = {
      id: 'msg_' + Date.now(),
      userId: user.id,
      userName: user.name,
      text: text.trim(),
      timestamp: Date.now()
    };
    
    // Optimistic chat update
    setRoom(prev => prev ? { ...prev, chat: [...prev.chat, newMsg] } : null);

    if (socket) {
      socket.emit('send_message', {
        roomId: room.roomId,
        message: { userId: user.id, userName: user.name, text: text.trim() }
      });
    }
  };

  const handleToggleMute = (isMuted: boolean) => {
    if (room && user) {
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          users: prev.users.map(u => u.id === user.id ? { ...u, isMuted } : u)
        };
      });
    }
    if (socket && room && user) {
      socket.emit('update_user_media', { roomId: room.roomId, userId: user.id, isMuted });
    }
  };

  const handleToggleVideo = (isVideoOn: boolean) => {
    if (room && user) {
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          users: prev.users.map(u => u.id === user.id ? { ...u, isVideoOn } : u)
        };
      });
    }
    if (socket && room && user) {
      socket.emit('update_user_media', { roomId: room.roomId, userId: user.id, isVideoOn });
    }
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
            onCreateRoom={(roomId, movie) => {
              handleCreateRoom(roomId, movie);
            }}
            onJoinRoom={handleJoinRoom}
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
