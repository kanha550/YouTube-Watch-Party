import { WebSocketServer } from 'ws';
import { CONFIG } from '../config.js';
import { handleWebSocketMessage, cleanUpUser } from './eventHandlers.js';

export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer });

  // Heartbeat to detect dead connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, CONFIG.HEARTBEAT_INTERVAL_MS);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  wss.on('connection', (socket) => {
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    socket.on('message', (data) => {
      handleWebSocketMessage(socket, data.toString());
    });

    socket.on('close', () => {
      cleanUpUser(socket);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err.message);
      cleanUpUser(socket);
    });
  });

  return wss;
}
