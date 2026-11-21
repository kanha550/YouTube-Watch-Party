import express from 'express';
import { roomManager } from '../services/RoomManager.js';
import { parseYouTubeVideoId } from '../utils/youtube.js';

const router = express.Router();

/**
 * Health check & stats endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    ...roomManager.getStats()
  });
});

/**
 * Check if a room exists before joining
 */
router.get('/rooms/:roomId', (req, res) => {
  const room = roomManager.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    roomId: room.id,
    participantCount: room.participants.size,
    hasHost: !!room.hostId,
    createdAt: room.createdAt
  });
});

/**
 * Validate YouTube URL utility endpoint
 */
router.post('/validate-video', (req, res) => {
  const { url } = req.body;
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    return res.status(400).json({ valid: false, error: 'Invalid YouTube URL or ID' });
  }
  res.json({ valid: true, videoId });
});

export default router;
