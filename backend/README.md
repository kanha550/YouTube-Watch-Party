# ⚙️ YouTube Watch Party — Backend

Backend REST API and WebSocket server built with **Node.js, Express, and native WebSockets (`ws`)**.

## 📁 Directory Structure

```
backend/
├── src/
│   ├── config.js            # Port, roles, event constants, sync tolerances
│   ├── index.js             # Server entrypoint (Express + WebSocket bootstrap)
│   ├── models/
│   │   └── Room.js          # Room domain model & state management
│   ├── routes/
│   │   └── api.js           # REST endpoints (/api/health, /api/rooms/:id)
│   ├── services/
│   │   ├── RoomManager.js   # Room lifecycle & 6-char code generation
│   │   └── RBACService.js   # Permission checks (Host, Moderator, Participant)
│   ├── utils/
│   │   └── youtube.js       # Video ID extractor & parser
│   └── websocket/
│       ├── eventHandlers.js # WS event handlers & authorization enforcement
│       ├── protocol.js      # Message broadcasting & helper functions
│       └── socketServer.js  # WebSocket server initialization & heartbeat
├── test/
│   └── watchparty.test.js   # Unit & RBAC automated tests (18 tests)
├── .env.example
└── package.json
```

## 🚀 Running the Backend Standalone

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (with auto-reload)
npm run dev

# 3. Run automated tests
npm test

# 4. Run in production
npm start
```

Default listening ports:
- HTTP API: `http://localhost:3001`
- WebSocket Server: `ws://localhost:3001`
