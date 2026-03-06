
export enum AppView {
  DASHBOARD = 'dashboard',
  CHAT = 'chat',
  VISION = 'vision',
  CINEMA = 'cinema',
  LIVE = 'live'
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  id: string;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  createdAt: number;
}
