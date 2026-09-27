export interface User {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOn?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface MovieItem {
  id: string;
  title: string;
  year?: number;
  poster: string;
  rating?: number;
  genres?: string[];
  description?: string;
  streamUrl: string;
  sourceSite?: string;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  users: User[];
  chat: ChatMessage[];
  currentMovie: MovieItem | null;
  isPlaying: boolean;
  currentTime: number;
  currentSite: string; // 'lordfilm' | 'kinogo' | 'youtube' | 'custom'
  searchQuery: string;
  activeView: 'browser' | 'player'; // directly controlled by users
  lastUpdated: number;
}
