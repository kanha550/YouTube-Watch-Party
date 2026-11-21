import crypto from 'crypto';
import { CONFIG, ROLES } from '../config.js';

export class Room {
  constructor(id, initialVideoId = CONFIG.DEFAULT_VIDEO_ID) {
    this.id = id;
    this.hostId = null;
    this.participants = new Map(); // userId -> { id, username, role, socket, joinedAt }
    this.state = {
      videoId: initialVideoId,
      currentTime: 0,
      playing: true,
      updatedAt: Date.now()
    };
    this.chatMessages = [];
    this.pendingRequests = new Map(); // requestId -> ActionRequest
    this.createdAt = Date.now();
  }

  addParticipant(user) {
    this.participants.set(user.id, user);
    if (!this.hostId) {
      this.hostId = user.id;
      user.role = ROLES.HOST;
    }
  }

  removeParticipant(userId) {
    const user = this.participants.get(userId);
    this.participants.delete(userId);
    // Remove any pending requests by this user
    for (const [reqId, req] of this.pendingRequests.entries()) {
      if (req.userId === userId) {
        this.pendingRequests.delete(reqId);
      }
    }
    return user;
  }

  getParticipant(userId) {
    return this.participants.get(userId);
  }

  getPublicParticipants() {
    return Array.from(this.participants.values()).map(({ id, username, role, joinedAt }) => ({
      id,
      username,
      role,
      joinedAt
    }));
  }

  getPublicRequests() {
    return Array.from(this.pendingRequests.values());
  }

  getPublicSnapshot() {
    return {
      roomId: this.id,
      hostId: this.hostId,
      state: { ...this.state },
      participants: this.getPublicParticipants(),
      pendingRequests: this.getPublicRequests(),
      chatMessages: this.chatMessages.slice(-50)
    };
  }

  addChatMessage(sender, text, isSystem = false) {
    const message = {
      id: crypto.randomUUID(),
      userId: sender?.id || 'system',
      username: sender?.username || 'System',
      role: sender?.role || 'system',
      text: String(text).trim().slice(0, 500),
      timestamp: Date.now(),
      isSystem
    };

    this.chatMessages.push(message);
    if (this.chatMessages.length > 100) {
      this.chatMessages.shift();
    }
    return message;
  }

  createActionRequest(user, action, payload = {}) {
    const requestId = crypto.randomUUID();
    const request = {
      id: requestId,
      userId: user.id,
      username: user.username,
      action, // 'change_video' | 'play' | 'pause' | 'seek' | 'request_mod'
      payload,
      createdAt: Date.now(),
      status: 'pending' // 'pending' | 'approved' | 'rejected'
    };
    this.pendingRequests.set(requestId, request);
    return request;
  }

  resolveActionRequest(requestId, status, resolverUser) {
    const request = this.pendingRequests.get(requestId);
    if (!request) return null;
    request.status = status;
    request.resolvedBy = {
      id: resolverUser.id,
      username: resolverUser.username,
      role: resolverUser.role
    };
    request.resolvedAt = Date.now();
    this.pendingRequests.delete(requestId);
    return request;
  }

  electNewHost() {
    if (this.participants.size === 0) {
      this.hostId = null;
      return null;
    }

    // Prefer existing moderators first
    for (const participant of this.participants.values()) {
      if (participant.role === ROLES.MODERATOR) {
        participant.role = ROLES.HOST;
        this.hostId = participant.id;
        return participant;
      }
    }

    // Otherwise, pick the earliest joined participant
    const nextUser = this.participants.values().next().value;
    if (nextUser) {
      nextUser.role = ROLES.HOST;
      this.hostId = nextUser.id;
      return nextUser;
    }

    return null;
  }
}
