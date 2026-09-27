import React, { useEffect, useState, useCallback } from 'react';
import { socketService } from './services/socket';
import { User, RoomState, Movie } from './types';
import { Header } from './components/Header';
import { Home } from './components/Home';
import { VideoPlayer } from './components/VideoPlayer';
import { MovieSearch } from './components/MovieSearch';
import { ChatPanel } from './components/ChatPanel';
import { SharedBrowser } from './components/SharedBrowser';
import { appEventBus, useTelegramSDK, useEventBusListener } from './services/eventBus';
import axios from 'axios';

const DEFAULT_MOVIE: Movie = {
  id: 'kinogo-featured',
  title: 'Kinogo Каталог (kinogo.mu)',
  originalTitle: 'Kinogo HD Cinema',
  year: 2026,
  poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop',
  description: 'Горячие премьеры фильмов и сериалов из базы Kinogo. Синхронное воспроизведение 1080p для всех друзей.',
  rating: 8.9,
  genres: ['Премьеры', 'Кинотеатр', 'Full HD'],
  streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8',
  episodes: [
    { season: 1, episode: 1, title: 'Серия 1: Премьерный показ 1080p', streamUrl: 'https://test-streams.mux.dev/x36h264/x36h264.m3u8' }
  ]
};

export default function App() {
  const { triggerHaptic } = useTelegramSDK();
  const [user, setUser] = useState<User>({
    id: 'tg_' + Math.floor(Math.random() * 100000),
    name: 'Пользователь'
  });
  const [room, setRoom] = useState<RoomState | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBrowserActive, setIsBrowserActive] = useState(false);

  // Initialize Telegram WebApp SDK directly
  useEffect(() => {
    const twa = (window as any).Telegram?.WebApp;
    if (twa) {
      try {
        twa.ready();
        twa.expand();
        if (twa.setHeaderColor) {
          twa.setHeaderColor('#0c0a09'); // Warm stone-950
        }
        
        if (twa.initDataUnsafe?.user) {
          const u = twa.initDataUnsafe.user;
          setUser({
            id: String(u.id),
            name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Пользователь',
            avatar: u.photo_url
          });
        }
      } catch (e) {}

      if (twa.initData) {
        axios.post('/api/auth', { initData: twa.initData })
          .then((res) => {
            if (res.data?.success && res.data?.user) {
              const tgUser = res.data.user;
              setUser({
                id: String(tgUser.id || 'tg_' + Math.floor(Math.random() * 10000)),
                name: tgUser.first_name || tgUser.username || 'Пользователь',
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
      if (updatedRoom.sharedBrowser?.isActive !== undefined) {
        setIsBrowserActive(updatedRoom.sharedBrowser.isActive);
      }
    });

    // Check URL parameters for direct room joining
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setTimeout(() => {
        handleJoinRoom(roomParam.toUpperCase());
      }, 200);
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Central Event Bus listeners replacing scattered DOM handlers
  useEventBusListener('UI_INTERACT', useCallback(() => {
    triggerHaptic('light');
  }, [triggerHaptic]));

  useEventBusListener('SUCCESS_FEEDBACK', useCallback(() => {
    triggerHaptic('success');
  }, [triggerHaptic]));

  useEventBusListener('ERROR_FEEDBACK', useCallback(() => {
    triggerHaptic('error');
  }, [triggerHaptic]));

  const handleCreateRoom = (roomId: string, chosenMovie?: Movie) => {
    triggerHaptic('medium');
    const selectedMovie = chosenMovie || DEFAULT_MOVIE;
    const initialUser: User = {
      ...user,
      isHost: true,
      isMuted: false,
      isVideoOn: false,
      isSpeaking: false
    };

    // Instant optimistic transition (0ms latency)
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
        userName: 'Кинозал',
        text: `Комната #${roomId} открыта. Браузер и синхронизация активны!`,
        timestamp: Date.now()
      }],
      lastUpdated: Date.now(),
      sharedBrowser: {
        isActive: false,
        currentUrl: 'https://google.com',
        controllerId: initialUser.id,
        controllerName: initialUser.name
      }
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
    triggerHaptic('medium');
    const initialUser: User = {
      ...user,
      isHost: false,
      isMuted: false,
      isVideoOn: false,
      isSpeaking: false
    };

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
        userName: 'Кинозал',
        text: `Вход в комнату #${roomId}...`,
        timestamp: Date.now()
      }],
      lastUpdated: Date.now()
    });

    if (socket) {
      socket.emit('join_room', { roomId, user: initialUser });
    }
  };

  const handleLeaveRoom = () => {
    triggerHaptic('light');
    setRoom(null);
    setIsBrowserActive(false);
  };

  const handleToggleBrowser = () => {
    triggerHaptic('medium');
    const nextState = !isBrowserActive;
    setIsBrowserActive(nextState);

    if (room) {
      setRoom(prev => prev ? {
        ...prev,
        sharedBrowser: {
          isActive: nextState,
          currentUrl: prev.sharedBrowser?.currentUrl || 'https://google.com',
          controllerId: user.id,
          controllerName: user.name
        }
      } : null);
    }

    if (socket && room) {
      socket.emit('browser_toggle', {
        roomId: room.roomId,
        isActive: nextState,
        url: room.sharedBrowser?.currentUrl || 'https://google.com',
        userId: user.id,
        userName: user.name
      });
    }
  };

  const handleSelectMovie = (movie: Movie) => {
    triggerHaptic('success');
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
    triggerHaptic('light');
    const newMsg = {
      id: 'msg_' + Date.now(),
      userId: user.id,
      userName: user.name,
      text: text.trim(),
      timestamp: Date.now()
    };

    setRoom(prev => prev ? { ...prev, chat: [...prev.chat, newMsg] } : null);

    if (socket) {
      socket.emit('send_message', {
        roomId: room.roomId,
        message: { userId: user.id, userName: user.name, text: text.trim() }
      });
    }
  };

  const handleToggleMute = (isMuted: boolean) => {
    triggerHaptic('light');
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
    triggerHaptic('light');
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-950 font-sans text-stone-100">
      <Header
        user={user}
        room={room}
        onLeaveRoom={handleLeaveRoom}
        onOpenSearch={() => setIsSearchOpen(true)}
        isBrowserActive={isBrowserActive}
        onToggleBrowser={room ? handleToggleBrowser : undefined}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {!room ? (
          <Home
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        ) : (
          <div className="flex-1 flex relative overflow-hidden">
            {isBrowserActive ? (
              <SharedBrowser
                room={room}
                currentUser={user}
                socket={socket}
                onClose={() => handleToggleBrowser()}
              />
            ) : (
              <VideoPlayer
                room={room}
                currentUser={user}
                socket={socket}
                onOpenChat={() => setIsChatOpen(!isChatOpen)}
                onOpenSearch={() => setIsSearchOpen(true)}
                onToggleMute={handleToggleMute}
                onToggleVideo={handleToggleVideo}
                isChatOpen={isChatOpen}
                isBrowserActive={isBrowserActive}
                onToggleBrowser={handleToggleBrowser}
              />
            )}

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
