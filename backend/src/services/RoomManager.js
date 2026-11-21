import crypto from 'crypto';
import { Room } from '../models/Room.js';
import { CONFIG } from '../config.js';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
  }

  generateRoomCode() {
    let code;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars O, 0, 1, I
    do {
      code = '';
      for (let i = 0; i < CONFIG.ROOM_CODE_LENGTH; i++) {
        code += chars.charAt(crypto.randomInt(chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(initialVideoId) {
    const roomId = this.generateRoomCode();
    const room = new Room(roomId, initialVideoId);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    if (!roomId || typeof roomId !== 'string') return null;
    return this.rooms.get(roomId.trim().toUpperCase());
  }

  deleteRoom(roomId) {
    return this.rooms.delete(roomId);
  }

  cleanupEmptyRooms() {
    for (const [id, room] of this.rooms.entries()) {
      if (room.participants.size === 0) {
        this.rooms.delete(id);
      }
    }
  }

  getStats() {
    let totalParticipants = 0;
    for (const room of this.rooms.values()) {
      totalParticipants += room.participants.size;
    }
    return {
      activeRooms: this.rooms.size,
      totalParticipants
    };
  }
}

export const roomManager = new RoomManager();
