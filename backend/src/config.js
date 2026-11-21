export const CONFIG = {
  PORT: process.env.PORT || 3001,
  DEFAULT_VIDEO_ID: 'rFZHOHl-L8A', // Lofi Girl - lofi hip hop radio
  MAX_ROOM_PARTICIPANTS: 50,
  ROOM_CODE_LENGTH: 6,
  SYNC_DRIFT_THRESHOLD_SECONDS: 1.5,
  HEARTBEAT_INTERVAL_MS: 30000,
  CLIENT_TIMEOUT_MS: 35000
};

export const ROLES = {
  HOST: 'host',
  MODERATOR: 'moderator',
  PARTICIPANT: 'participant'
};

export const WS_EVENTS = {
  // Client -> Server
  JOIN_ROOM: 'join_room',
  CREATE_ROOM: 'create_room',
  LEAVE_ROOM: 'leave_room',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  CHANGE_VIDEO: 'change_video',
  ASSIGN_ROLE: 'assign_role',
  REMOVE_PARTICIPANT: 'remove_participant',
  TRANSFER_HOST: 'transfer_host',
  ACTION_REQUEST: 'action_request',
  RESOLVE_REQUEST: 'resolve_request',
  CHAT_MESSAGE: 'chat_message',
  SYNC_REQUEST: 'sync_request',

  // Server -> Client
  ROOM_JOINED: 'room_joined',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  SYNC_STATE: 'sync_state',
  ROLE_ASSIGNED: 'role_assigned',
  PARTICIPANT_REMOVED: 'participant_removed',
  HOST_TRANSFERRED: 'host_transferred',
  ACTION_REQUEST_CREATED: 'action_request_created',
  ACTION_REQUEST_RESOLVED: 'action_request_resolved',
  CHAT_BROADCAST: 'chat_message',
  ERROR: 'error'
};
