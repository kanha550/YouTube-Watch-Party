import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/models/Room.js';
import { RoomManager } from '../src/services/RoomManager.js';
import { RBACService } from '../src/services/RBACService.js';
import { parseYouTubeVideoId } from '../src/utils/youtube.js';
import { ROLES } from '../src/config.js';

describe('YouTube Watch Party - Core Unit & RBAC Tests', () => {

  describe('1. YouTube Video ID Parser', () => {
    test('extracts ID from standard watch URL', () => {
      const id = parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      assert.equal(id, 'dQw4w9WgXcQ');
    });

    test('extracts ID from youtu.be short URL', () => {
      const id = parseYouTubeVideoId('https://youtu.be/jfKfPfyJRdk');
      assert.equal(id, 'jfKfPfyJRdk');
    });

    test('extracts ID from embed URL', () => {
      const id = parseYouTubeVideoId('https://www.youtube.com/embed/4xDzrJKXOOY');
      assert.equal(id, '4xDzrJKXOOY');
    });

    test('extracts ID from shorts URL', () => {
      const id = parseYouTubeVideoId('https://www.youtube.com/shorts/aqz-KE-bpKQ');
      assert.equal(id, 'aqz-KE-bpKQ');
    });

    test('accepts raw 11-character ID', () => {
      const id = parseYouTubeVideoId('BHACKCNDMW8');
      assert.equal(id, 'BHACKCNDMW8');
    });

    test('returns null for invalid inputs', () => {
      assert.equal(parseYouTubeVideoId('https://vimeo.com/12345'), null);
      assert.equal(parseYouTubeVideoId('too-short'), null);
      assert.equal(parseYouTubeVideoId('this-string-is-way-too-long-to-be-a-video-id'), null);
      assert.equal(parseYouTubeVideoId(''), null);
    });
  });

  describe('2. Room Model & Lifecycle', () => {
    test('creates a room with unique code and default video', () => {
      const roomManager = new RoomManager();
      const room = roomManager.createRoom();

      assert.ok(room.id);
      assert.equal(room.id.length, 6);
      assert.equal(room.participants.size, 0);
      assert.equal(room.state.playing, false);
      assert.ok(room.state.videoId);
    });

    test('first participant automatically becomes HOST', () => {
      const room = new Room('TEST01');
      const alice = { id: 'u1', username: 'Alice', role: ROLES.PARTICIPANT };

      room.addParticipant(alice);
      assert.equal(room.hostId, 'u1');
      assert.equal(alice.role, ROLES.HOST);
    });

    test('second participant joins as PARTICIPANT', () => {
      const room = new Room('TEST02');
      const alice = { id: 'u1', username: 'Alice', role: ROLES.PARTICIPANT };
      const bob = { id: 'u2', username: 'Bob', role: ROLES.PARTICIPANT };

      room.addParticipant(alice);
      room.addParticipant(bob);

      assert.equal(room.hostId, 'u1');
      assert.equal(alice.role, ROLES.HOST);
      assert.equal(bob.role, ROLES.PARTICIPANT);
    });

    test('when host leaves, room elects next host', () => {
      const room = new Room('TEST03');
      const alice = { id: 'u1', username: 'Alice', role: ROLES.PARTICIPANT };
      const bob = { id: 'u2', username: 'Bob', role: ROLES.PARTICIPANT };
      const charlie = { id: 'u3', username: 'Charlie', role: ROLES.MODERATOR };

      room.addParticipant(alice);
      room.addParticipant(bob);
      room.addParticipant(charlie);

      room.removeParticipant('u1');
      const newHost = room.electNewHost();

      // Charlie was moderator, so charlie gets prioritized over standard participant bob
      assert.equal(newHost.id, 'u3');
      assert.equal(newHost.role, ROLES.HOST);
      assert.equal(room.hostId, 'u3');
    });
  });

  describe('3. Role-Based Access Control (RBAC)', () => {
    test('playback control permissions', () => {
      assert.equal(RBACService.canControlPlayback(ROLES.HOST), true);
      assert.equal(RBACService.canControlPlayback(ROLES.MODERATOR), true);
      assert.equal(RBACService.canControlPlayback(ROLES.PARTICIPANT), false);
    });

    test('video change permissions', () => {
      assert.equal(RBACService.canChangeVideo(ROLES.HOST), true);
      assert.equal(RBACService.canChangeVideo(ROLES.MODERATOR), true);
      assert.equal(RBACService.canChangeVideo(ROLES.PARTICIPANT), false);
    });

    test('role assignment permissions', () => {
      const targetParticipant = { id: 'u2', role: ROLES.PARTICIPANT };
      const targetHost = { id: 'u1', role: ROLES.HOST };

      // Host can promote participant to moderator
      assert.equal(RBACService.canAssignRole(ROLES.HOST, targetParticipant, ROLES.MODERATOR), true);

      // Moderator cannot assign roles
      assert.equal(RBACService.canAssignRole(ROLES.MODERATOR, targetParticipant, ROLES.MODERATOR), false);

      // Participant cannot assign roles
      assert.equal(RBACService.canAssignRole(ROLES.PARTICIPANT, targetParticipant, ROLES.MODERATOR), false);

      // Host cannot change host role via assignRole
      assert.equal(RBACService.canAssignRole(ROLES.HOST, targetHost, ROLES.PARTICIPANT), false);
    });

    test('participant removal permissions', () => {
      const targetParticipant = { id: 'u2', role: ROLES.PARTICIPANT };
      const targetHost = { id: 'u1', role: ROLES.HOST };

      assert.equal(RBACService.canRemoveParticipant(ROLES.HOST, targetParticipant), true);
      assert.equal(RBACService.canRemoveParticipant(ROLES.HOST, targetHost), false); // Cannot remove host
      assert.equal(RBACService.canRemoveParticipant(ROLES.MODERATOR, targetParticipant), false);
      assert.equal(RBACService.canRemoveParticipant(ROLES.PARTICIPANT, targetParticipant), false);
    });

    test('host transfer permissions', () => {
      const targetParticipant = { id: 'u2', role: ROLES.PARTICIPANT };
      const targetHost = { id: 'u1', role: ROLES.HOST };

      assert.equal(RBACService.canTransferHost(ROLES.HOST, targetParticipant), true);
      assert.equal(RBACService.canTransferHost(ROLES.HOST, targetHost), false);
      assert.equal(RBACService.canTransferHost(ROLES.MODERATOR, targetParticipant), false);
    });
  });

  describe('4. Participant Action Request & Approval Workflow', () => {
    test('participant creates action request and host approves it', () => {
      const room = new Room('TEST04');
      const host = { id: 'u1', username: 'HostUser', role: ROLES.HOST };
      const participant = { id: 'u2', username: 'ViewerBob', role: ROLES.PARTICIPANT };

      room.addParticipant(host);
      room.addParticipant(participant);

      // Participant creates request to change video
      const req = room.createActionRequest(participant, 'change_video', {
        url: 'https://youtu.be/dQw4w9WgXcQ',
        parsedVideoId: 'dQw4w9WgXcQ'
      });

      assert.ok(req.id);
      assert.equal(req.status, 'pending');
      assert.equal(room.pendingRequests.size, 1);

      // Host approves request
      const resolved = room.resolveActionRequest(req.id, 'approved', host);
      assert.equal(resolved.status, 'approved');
      assert.equal(resolved.resolvedBy.username, 'HostUser');
      assert.equal(room.pendingRequests.size, 0); // Removed from pending
    });
  });

  describe('5. Chat Messages', () => {
    test('records user chat messages with roles and timestamps', () => {
      const room = new Room('TEST05');
      const user = { id: 'u1', username: 'Alice', role: ROLES.HOST };

      const msg = room.addChatMessage(user, 'Hello world!');
      assert.equal(msg.userId, 'u1');
      assert.equal(msg.username, 'Alice');
      assert.equal(msg.role, ROLES.HOST);
      assert.equal(msg.text, 'Hello world!');
      assert.equal(msg.isSystem, false);
      assert.equal(room.chatMessages.length, 1);
    });

    test('records system notifications', () => {
      const room = new Room('TEST06');
      const sysMsg = room.addChatMessage(null, 'Alice changed video.', true);

      assert.equal(sysMsg.isSystem, true);
      assert.equal(sysMsg.text, 'Alice changed video.');
    });
  });
});
