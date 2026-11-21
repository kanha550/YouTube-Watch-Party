import WebSocket from 'ws';
import { WS_EVENTS } from '../config.js';

export function sendJson(socket, type, payload = {}) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify({ type, ...payload }));
    } catch (err) {
      console.error('Error sending json to socket:', err.message);
    }
  }
}

export function sendError(socket, message, code = 'ACTION_REJECTED') {
  sendJson(socket, WS_EVENTS.ERROR, { message, code });
}

export function broadcastToRoom(room, type, payload = {}, exceptUserId = null) {
  for (const participant of room.participants.values()) {
    if (participant.id !== exceptUserId && participant.socket) {
      sendJson(participant.socket, type, payload);
    }
  }
}

export function broadcastRoomState(room, exceptUserId = null) {
  broadcastToRoom(room, WS_EVENTS.SYNC_STATE, {
    state: room.state
  }, exceptUserId);
}

export function broadcastParticipantsUpdate(room) {
  broadcastToRoom(room, 'participants_updated', {
    participants: room.getPublicParticipants(),
    hostId: room.hostId
  });
}

export function broadcastSystemMessage(room, text) {
  const msg = room.addChatMessage(null, text, true);
  broadcastToRoom(room, WS_EVENTS.CHAT_BROADCAST, { message: msg });
  return msg;
}
