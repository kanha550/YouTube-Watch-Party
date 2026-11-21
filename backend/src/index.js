import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CONFIG } from './config.js';
import apiRoutes from './routes/api.js';
import { setupWebSocketServer } from './websocket/socketServer.js';
import { initDatabase } from './db/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Mount REST API
app.use('/api', apiRoutes);

// In production, serve the built React frontend dist folder
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2>🎥 SyncRoom Server is running!</h2>
        <p>WebSocket server listening on port ${CONFIG.PORT}.</p>
        <p>Run the frontend with <code>cd frontend && npm run dev</code>.</p>
      </div>
    `);
  });
}

const server = http.createServer(app);

// Mount WebSockets
setupWebSocketServer(server);

// Initialize PostgreSQL (falls back gracefully to in-memory if no credentials)
await initDatabase();

server.listen(CONFIG.PORT, () => {
  console.log(`===============================================`);
  console.log(`🎬 YouTube Watch Party Server`);
  console.log(`🌐 HTTP API:       http://localhost:${CONFIG.PORT}`);
  console.log(`⚡ WebSocket Server: ws://localhost:${CONFIG.PORT}`);
  console.log(`===============================================`);
});
