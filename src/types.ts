export interface User {
  id: string;
  name: string;
  avatar?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isVideoOn?: boolean;
  isSpeaking?: boolean;
}

export interface MovieEpisode {
  season: number;
  episode: number;
  title: string;
  streamUrl: string;
}

export interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  year?: number;
  poster?: string;
  description?: string;
  rating?: number;
  genres?: string[];
  streamUrl: string;
  sourceSite?: string;
  episodes?: MovieEpisode[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
}

export interface SharedBrowserState {
  isActive: boolean;
  currentUrl: string;
  controllerId: string;
  controllerName: string;
  lastScrollY?: number;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  movie: Movie | null;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  users: User[];
  chat: ChatMessage[];
  lastUpdated: number;
  sharedBrowser?: SharedBrowserState;
}
