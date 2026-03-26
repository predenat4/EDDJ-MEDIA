export type MediaType = 'photo' | 'video' | 'audio';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  thumbnail: string;
  category: string;
  createdAt?: string;
  authorUid?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
}
