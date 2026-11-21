import crypto from 'crypto';
import { CONFIG, ROLES, WS_EVENTS } from '../config.js';
import { roomManager } from '../services/RoomManager.js';
import { RBACService } from '../services/RBACService.js';
import { parseYouTubeVideoId } from '../utils/youtube.js';
import {
  sendJson,
  sendError,
  broadcastToRoom,
  broadcastRoomState,
  broadcastParticipantsUpdate,
  broadcastSystemMessage
} from './protocol.js';
import {
  dbSaveRoom,
  dbSaveParticipant,
  dbRemoveParticipant,
  dbSaveChatMessage,
  dbSaveActionRequest,
  dbResolveActionRequest
} from '../db/index.js';

export function handleWebSocketMessage(socket, rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch {
    return sendError(socket, 'Invalid message payload (must be valid JSON).');
  }

  const { type, ...payload } = message;
  if (!type) {
    return sendError(socket, 'Missing event type.');
  }

  // Route event
  switch (type) {
    case WS_EVENTS.CREATE_ROOM:
    case WS_EVENTS.JOIN_ROOM:
      return handleJoinOrCreateRoom(socket, type, payload);

    case WS_EVENTS.LEAVE_ROOM:
      return handleLeaveRoom(socket);

    case WS_EVENTS.PLAY:
      return handlePlay(socket, payload);

    case WS_EVENTS.PAUSE:
      return handlePause(socket, payload);

    case WS_EVENTS.SEEK:
      return handleSeek(socket, payload);

    case WS_EVENTS.CHANGE_VIDEO:
      return handleChangeVideo(socket, payload);

    case WS_EVENTS.ASSIGN_ROLE:
      return handleAssignRole(socket, payload);

    case WS_EVENTS.REMOVE_PARTICIPANT:
      return handleRemoveParticipant(socket, payload);

    case WS_EVENTS.TRANSFER_HOST:
      return handleTransferHost(socket, payload);

    case WS_EVENTS.ACTION_REQUEST:
      return handleActionRequest(socket, payload);

    case WS_EVENTS.RESOLVE_REQUEST:
      return handleResolveRequest(socket, payload);

    case WS_EVENTS.CHAT_MESSAGE:
      return handleChatMessage(socket, payload);

    case WS_EVENTS.SYNC_REQUEST:
      return handleSyncRequest(socket);

    default:
      return sendError(socket, `Unknown event type: ${type}`);
  }
}

function handleJoinOrCreateRoom(socket, eventType, { roomId, username, initialVideo }) {
  const cleanUsername = String(username || '').trim().slice(0, 24);
  if (!cleanUsername) {
    return sendError(socket, 'Please provide a valid display name (1-24 characters).');
  }

  let room;
  let isCreator = false;

  if (eventType === WS_EVENTS.CREATE_ROOM) {
    let videoId = CONFIG.DEFAULT_VIDEO_ID;
    if (initialVideo) {
      const parsed = parseYouTubeVideoId(initialVideo);
      if (parsed) videoId = parsed;
    }
    room = roomManager.createRoom(videoId);
    isCreator = true;
  } else {
    room = roomManager.getRoom(roomId);
    if (!room) {
      return sendError(socket, `Room "${roomId}" does not exist. Check code or create a new room.`);
    }
  }

  if (room.participants.size >= CONFIG.MAX_ROOM_PARTICIPANTS) {
    return sendError(socket, 'This watch party is currently full (maximum 50 participants).');
  }

  const userId = crypto.randomUUID();
  const role = isCreator || !room.hostId ? ROLES.HOST : ROLES.PARTICIPANT;

  const user = {
    id: userId,
    username: cleanUsername,
    role,
    socket,
    joinedAt: Date.now()
  };

  room.addParticipant(user);
  socket.user = user;
  socket.room = room;

  dbSaveRoom(room);
  dbSaveParticipant(room.id, user);

  // Send initial room snapshot to joining user
  sendJson(socket, WS_EVENTS.ROOM_JOINED, {
    self: { id: user.id, username: user.username, role: user.role },
    ...room.getPublicSnapshot()
  });

  // Notify everyone else
  broadcastToRoom(room, WS_EVENTS.USER_JOINED, {
    user: { id: user.id, username: user.username, role: user.role, joinedAt: user.joinedAt },
    participants: room.getPublicParticipants()
  }, user.id);

  // System chat notification
  broadcastSystemMessage(room, `${user.username} joined the party as ${user.role}.`);
}

function handleLeaveRoom(socket) {
  if (socket.room && socket.user) {
    cleanUpUser(socket);
  }
}

function handlePlay(socket, { currentTime }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'You must be in a room to perform this action.');

  if (!RBACService.canControlPlayback(user.role)) {
    return sendError(
      socket,
      'Permission denied: Only the Host or a Moderator can play the video. Use "Request Action" to ask.'
    );
  }

  room.state.playing = true;
  if (Number.isFinite(Number(currentTime))) {
    room.state.currentTime = Math.max(0, Number(currentTime));
  }
  room.state.updatedAt = Date.now();

  broadcastRoomState(room);
  dbSaveRoom(room);
}

function handlePause(socket, { currentTime }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'You must be in a room to perform this action.');

  if (!RBACService.canControlPlayback(user.role)) {
    return sendError(
      socket,
      'Permission denied: Only the Host or a Moderator can pause the video. Use "Request Action" to ask.'
    );
  }

  room.state.playing = false;
  if (Number.isFinite(Number(currentTime))) {
    room.state.currentTime = Math.max(0, Number(currentTime));
  }
  room.state.updatedAt = Date.now();

  broadcastRoomState(room);
  dbSaveRoom(room);
}

function handleSeek(socket, { time }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'You must be in a room to perform this action.');

  if (!RBACService.canControlPlayback(user.role)) {
    return sendError(
      socket,
      'Permission denied: Only the Host or a Moderator can scrub the video timeline.'
    );
  }

  const seekTime = Number(time);
  if (!Number.isFinite(seekTime) || seekTime < 0) {
    return sendError(socket, 'Invalid seek timestamp.');
  }

  room.state.currentTime = seekTime;
  room.state.updatedAt = Date.now();

  broadcastRoomState(room);
  dbSaveRoom(room);
}

function handleChangeVideo(socket, { url, videoId }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'You must be in a room to perform this action.');

  if (!RBACService.canChangeVideo(user.role)) {
    return sendError(
      socket,
      'Permission denied: Only the Host or a Moderator can change the video.'
    );
  }

  const parsedId = parseYouTubeVideoId(url || videoId);
  if (!parsedId) {
    return sendError(socket, 'Please enter a valid YouTube URL or 11-character video ID.');
  }

  room.state.videoId = parsedId;
  room.state.currentTime = 0;
  room.state.playing = true;
  room.state.updatedAt = Date.now();

  broadcastRoomState(room);
  dbSaveRoom(room);
  broadcastSystemMessage(room, `${user.username} loaded a new video.`);
}

function handleAssignRole(socket, { userId, role }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'Not in a room.');

  const target = room.getParticipant(userId);
  if (!target) return sendError(socket, 'Target participant not found.');

  if (!RBACService.canAssignRole(user.role, target, role)) {
    return sendError(socket, 'Permission denied: Only the Host can change roles.');
  }

  target.role = role;
  dbSaveParticipant(room.id, target);

  broadcastToRoom(room, WS_EVENTS.ROLE_ASSIGNED, {
    userId: target.id,
    role,
    participants: room.getPublicParticipants()
  });

  broadcastSystemMessage(room, `${target.username} was assigned the role of ${role.toUpperCase()}.`);
}

function handleRemoveParticipant(socket, { userId }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'Not in a room.');

  const target = room.getParticipant(userId);
  if (!target) return sendError(socket, 'Participant not found.');

  if (!RBACService.canRemoveParticipant(user.role, target)) {
    return sendError(socket, 'Permission denied: Only the Host can remove participants.');
  }

  // Notify target before disconnecting
  sendJson(target.socket, WS_EVENTS.PARTICIPANT_REMOVED, {
    message: 'You have been removed from the room by the Host.',
    kicked: true
  });

  room.removeParticipant(target.id);
  dbRemoveParticipant(room.id, target.id);
  target.socket.close();

  broadcastToRoom(room, WS_EVENTS.PARTICIPANT_REMOVED, {
    userId: target.id,
    participants: room.getPublicParticipants()
  });

  broadcastSystemMessage(room, `${target.username} was removed by the Host.`);
}

function handleTransferHost(socket, { userId }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'Not in a room.');

  const target = room.getParticipant(userId);
  if (!target) return sendError(socket, 'Target participant not found.');

  if (!RBACService.canTransferHost(user.role, target)) {
    return sendError(socket, 'Permission denied: Only the Host can transfer host status.');
  }

  // Current host steps down to Moderator
  user.role = ROLES.MODERATOR;
  target.role = ROLES.HOST;
  room.hostId = target.id;
  dbSaveRoom(room);
  dbSaveParticipant(room.id, user);
  dbSaveParticipant(room.id, target);

  broadcastToRoom(room, WS_EVENTS.HOST_TRANSFERRED, {
    newHostId: target.id,
    previousHostId: user.id,
    participants: room.getPublicParticipants()
  });

  broadcastSystemMessage(room, `👑 ${user.username} transferred Host role to ${target.username}!`);
}

function handleActionRequest(socket, { action, payload }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'Not in a room.');

  const validActions = ['change_video', 'play', 'pause', 'seek', 'request_mod'];
  if (!validActions.includes(action)) {
    return sendError(socket, 'Invalid action request type.');
  }

  // If changing video, check if video ID is parsable
  if (action === 'change_video') {
    const videoId = parseYouTubeVideoId(payload?.url || payload?.videoId);
    if (!videoId) {
      return sendError(socket, 'Please provide a valid YouTube URL for the video request.');
    }
    payload.parsedVideoId = videoId;
  }

  const request = room.createActionRequest(user, action, payload);
  dbSaveActionRequest(room.id, request);

  // Broadcast the new request to all participants (so Host/Mod can approve, and others can see pending requests)
  broadcastToRoom(room, WS_EVENTS.ACTION_REQUEST_CREATED, {
    request,
    pendingRequests: room.getPublicRequests()
  });

  broadcastSystemMessage(
    room,
    `📝 ${user.username} requested: ${action.replace('_', ' ').toUpperCase()}${
      payload?.note ? ` ("${payload.note}")` : ''
    }. Waiting for Host/Mod approval.`
  );
}

function handleResolveRequest(socket, { requestId, approved }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'Not in a room.');

  if (!RBACService.canResolveRequest(user.role)) {
    return sendError(socket, 'Permission denied: Only the Host or a Moderator can approve/reject requests.');
  }

  const status = approved ? 'approved' : 'rejected';
  const resolved = room.resolveActionRequest(requestId, status, user);

  if (!resolved) {
    return sendError(socket, 'Request not found or already resolved.');
  }

  dbResolveActionRequest(requestId, status, user);
  if (approved) dbSaveRoom(room);

  if (approved) {
    // Execute the approved action immediately!
    switch (resolved.action) {
      case 'change_video': {
        const videoId = resolved.payload?.parsedVideoId || parseYouTubeVideoId(resolved.payload?.url);
        if (videoId) {
          room.state.videoId = videoId;
          room.state.currentTime = 0;
          room.state.playing = true;
          room.state.updatedAt = Date.now();
          broadcastRoomState(room);
          broadcastSystemMessage(
            room,
            `✅ ${user.username} approved ${resolved.username}'s request to change video!`
          );
        }
        break;
      }
      case 'play': {
        room.state.playing = true;
        room.state.updatedAt = Date.now();
        broadcastRoomState(room);
        broadcastSystemMessage(room, `✅ ${user.username} approved play request by ${resolved.username}.`);
        break;
      }
      case 'pause': {
        room.state.playing = false;
        room.state.updatedAt = Date.now();
        broadcastRoomState(room);
        broadcastSystemMessage(room, `✅ ${user.username} approved pause request by ${resolved.username}.`);
        break;
      }
      case 'seek': {
        const time = Number(resolved.payload?.time);
        if (Number.isFinite(time) && time >= 0) {
          room.state.currentTime = time;
          room.state.updatedAt = Date.now();
          broadcastRoomState(room);
          broadcastSystemMessage(
            room,
            `✅ ${user.username} approved seek request to ${Math.floor(time)}s by ${resolved.username}.`
          );
        }
        break;
      }
      case 'request_mod': {
        const target = room.getParticipant(resolved.userId);
        if (target && target.role === ROLES.PARTICIPANT) {
          target.role = ROLES.MODERATOR;
          broadcastParticipantsUpdate(room);
          broadcastSystemMessage(
            room,
            `🛡️ ${user.username} approved moderator promotion for ${resolved.username}!`
          );
        }
        break;
      }
    }
  } else {
    broadcastSystemMessage(
      room,
      `❌ ${user.username} declined ${resolved.username}'s ${resolved.action.replace('_', ' ')} request.`
    );
  }

  broadcastToRoom(room, WS_EVENTS.ACTION_REQUEST_RESOLVED, {
    requestId,
    status,
    request: resolved,
    pendingRequests: room.getPublicRequests()
  });
}

function handleChatMessage(socket, { text }) {
  const { room, user } = socket;
  if (!room || !user) return sendError(socket, 'Not in a room.');

  const cleanText = String(text || '').trim();
  if (!cleanText) return;

  const chatMsg = room.addChatMessage(user, cleanText);
  dbSaveChatMessage(room.id, chatMsg);
  broadcastToRoom(room, WS_EVENTS.CHAT_BROADCAST, { message: chatMsg });
}

function handleSyncRequest(socket) {
  const { room, user } = socket;
  if (!room || !user) return;

  sendJson(socket, WS_EVENTS.SYNC_STATE, {
    state: room.state
  });
}

export function cleanUpUser(socket) {
  const { room, user } = socket;
  if (!room || !user) return;

  room.removeParticipant(user.id);
  dbRemoveParticipant(room.id, user.id);
  dbSaveRoom(room);

  if (user.id === room.hostId) {
    const newHost = room.electNewHost();
    if (newHost) {
      broadcastToRoom(room, WS_EVENTS.HOST_TRANSFERRED, {
        newHostId: newHost.id,
        participants: room.getPublicParticipants()
      });
      broadcastSystemMessage(room, `👑 ${newHost.username} is now the Host!`);
    } else {
      // Room is now empty, delete it
      roomManager.deleteRoom(room.id);
      return;
    }
  }

  broadcastToRoom(room, WS_EVENTS.USER_LEFT, {
    userId: user.id,
    username: user.username,
    participants: room.getPublicParticipants()
  });

  broadcastSystemMessage(room, `${user.username} left the room.`);
}
