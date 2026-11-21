export type Role = 'host' | 'moderator' | 'participant';

export interface Participant {
  id: string;
  username: string;
  role: Role;
  joinedAt?: number;
}

export interface VideoState {
  videoId: string;
  currentTime: number;
  playing: boolean;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  role: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export type ActionRequestType = 'change_video' | 'play' | 'pause' | 'seek' | 'request_mod';

export interface ActionRequest {
  id: string;
  userId: string;
  username: string;
  action: ActionRequestType;
  payload: {
    url?: string;
    videoId?: string;
    time?: number;
    note?: string;
    [key: string]: any;
  };
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected';
  resolvedBy?: {
    id: string;
    username: string;
    role: string;
  };
}

export interface RoomSnapshot {
  roomId: string;
  hostId: string;
  state: VideoState;
  participants: Participant[];
  pendingRequests: ActionRequest[];
  chatMessages: ChatMessage[];
  self: Participant;
}
