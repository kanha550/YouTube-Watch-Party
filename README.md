# 🎬 SyncParty — YouTube Watch Party System

A modern, real-time synchronized YouTube watch party web application built with completely separated **frontend (`frontend/`)** and **backend (`backend/`)** architectures.

Allows multiple participants to watch YouTube videos in frame-accurate sync with room codes, shareable invite links, granular **Role-Based Access Control (RBAC)**, an interactive **Participant Action Request & Approval** workflow, and live room chat.

---

## 🏗️ Clean & Separated Architecture

The project is structured into two completely independent, decoupled services:

```
YouTube Watch Party/
├── backend/                  # Standalone Node.js + Express + WebSockets (ws)
│   ├── src/
│   │   ├── config.js         # Port, default video, roles, event definitions
│   │   ├── index.js          # Express HTTP + WebSocket server bootstrap
│   │   ├── models/
│   │   │   └── Room.js       # Room entity (state, participants, requests, chat)
│   │   ├── routes/
│   │   │   └── api.js        # REST API (/api/health, /api/rooms/:id)
│   │   ├── services/
│   │   │   ├── RoomManager.js# Room lifecycle management & code generator
│   │   │   └── RBACService.js# Permission enforcement & role validator
│   │   ├── utils/
│   │   │   └── youtube.js    # Multi-format YouTube URL/ID parser
│   │   └── websocket/
│   │       ├── protocol.js   # Typed message broadcaster & helpers
│   │       ├── socketServer.js # WS connection lifecycle & heartbeat
│   │       └── eventHandlers.js# Event router & RBAC-protected handlers
│   ├── test/
│   │   └── watchparty.test.js# Automated unit & RBAC test suite (18 tests)
│   ├── .env.example
│   ├── README.md             # Dedicated backend documentation
│   └── package.json
│
├── frontend/                 # Standalone React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── types/            # TypeScript interfaces (Role, VideoState, etc.)
│   │   ├── services/         # WebSocket client singleton with auto-reconnect
│   │   ├── hooks/
│   │   │   ├── useWatchParty.ts    # Room state, chat, participants, requests
│   │   │   └── useYouTubePlayer.ts # YouTube IFrame API & loop prevention
│   │   ├── components/
│   │   │   ├── Landing/      # Room creation & join page
│   │   │   ├── Header/       # Top navbar with room pill & invite link
│   │   │   ├── VideoPlayer/  # Responsive 16:9 YouTube iframe wrapper
│   │   │   ├── Controls/     # Play/pause, scrubber bar, URL input
│   │   │   ├── Participants/ # User list, role badges, host actions
│   │   │   ├── Requests/     # Action request modal & approval drawer
│   │   │   ├── Chat/         # Live chat & quick emoji bar
│   │   │   └── common/       # Role badges, status pills
│   │   ├── App.tsx           # Main application view
│   │   └── index.css         # Modern sleek dark-theme CSS
│   ├── .env.example
│   ├── README.md             # Dedicated frontend documentation
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── package.json              # Root orchestrator for convenience
└── README.md
```

---

## 🌟 Key Features

1. **Real-Time Video Synchronization**
   - Synchronized Play / Pause across all connected party members.
   - Seek / Scrub synchronization with drift compensation (suppresses micro-stutter below 1.5s tolerance).
   - Loop-prevention guards (`isSyncingRef`) preventing infinite echo-playback events between clients and server.
   - Dynamic video change supporting YouTube URLs (`watch?v=...`, `youtu.be/...`, `/embed/`, `/shorts/`) and raw 11-char IDs.

2. **Room-Based Architecture**
   - Create watch rooms with distinct 6-character room codes (e.g., `A9K3P2`).
   - One-click invite link copying (`?room=A9K3P2`).
   - Join existing rooms via URL or code.
   - Automatic room cleanup when the last participant leaves.

3. **Role-Based Access Control (RBAC)**
   - **Host (Room Creator / Admin)**: Full control — play, pause, seek, load new videos, promote/demote participants to Moderator, kick participants, transfer host role. Host actions cannot be overridden.
   - **Moderator**: Play, pause, seek, load new videos, and review participant action requests.
   - **Participant (Viewer)**: Watch-only mode. Direct playback controls are locked.

4. **Participant Action Request & Approval Workflow**
   - As required by the specification, restricted participants can submit an **Action Request** to the room:
     - Request to change video (with URL & optional note)
     - Request to play or pause
     - Request to jump/seek to timestamp
     - Request promotion to Moderator
   - Hosts and Moderators receive a live **Approval Drawer** with real-time **[Approve]** and **[Decline]** actions.
   - Upon approval, the server executes the action immediately for the entire room and posts a system announcement!

5. **Live Room Chat & System Feed**
   - Real-time bidirectional chat with user avatars, timestamps, and role badges.
   - System feed for room events (joins, departures, role assignments, video changes, approved requests).
   - Quick emoji reaction bar.

---

## 🔐 Role & Permission Matrix

| Capability | Host | Moderator | Participant / Viewer |
| :--- | :---: | :---: | :---: |
| Watch Synchronized Video | ✅ | ✅ | ✅ |
| Play / Pause Video | ✅ | ✅ | 🔒 (Submit Request) |
| Seek / Scrub Timeline | ✅ | ✅ | 🔒 (Submit Request) |
| Change YouTube Video | ✅ | ✅ | 🔒 (Submit Request) |
| Request Action from Host/Mod | — | — | ✅ |
| Approve / Reject Requests | ✅ | ✅ | ❌ |
| Assign Role (Participant ↔ Mod) | ✅ | ❌ | ❌ |
| Transfer Host Role | ✅ | ❌ | ❌ |
| Remove / Kick Participant | ✅ | ❌ | ❌ |
| Room Chat & Reactions | ✅ | ✅ | ✅ |

---

## 🚀 Running the Project

### Option A: From the Root Directory (Convenience Runner)

```bash
# 1. Start both backend & frontend concurrently
npm run dev

# 2. Run backend automated tests
npm test

# 3. Build frontend for production
npm run build
```

- **Frontend App**: `http://localhost:5173`
- **Backend API & WebSockets**: `http://localhost:3001` (`ws://localhost:3001`)

---

### Option B: Running Frontend and Backend Independently

#### Terminal 1 — Backend
```bash
cd backend
npm install
npm run dev
```
Starts backend server on `http://localhost:3001` with WebSockets on `ws://localhost:3001`.

#### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```
Starts frontend Vite development server on `http://localhost:5173`.

---

## 🧪 Running Automated Tests

Run the backend test suite:
```bash
npm test
```
Or directly inside `backend/`:
```bash
cd backend
npm test
```

All 18 tests cover:
- YouTube ID parser (standard URLs, shortlinks, embeds, shorts, raw IDs, invalid strings)
- Room creation, code generation, host assignment, and automatic host migration
- RBAC validation (playback controls, video changes, role promotions, removals, transfers)
- Participant action request & approval workflow
- Chat and system notifications

---

## ☁️ Deploying to Render

This repository includes a Render Blueprint in `render.yaml`. It deploys the frontend and backend as one Node.js web service: the backend serves the production frontend, REST API, and WebSocket connections from the same Render URL.

1. Push the project to a GitHub repository.
2. Sign in to [Render](https://render.com/) and choose **New + → Blueprint**.
3. Connect the GitHub repository and select the branch to deploy.
4. Review the `syncparty` web service and choose **Apply**.
5. When the deployment finishes, open the service URL shown in Render. The health endpoint is available at `/api/health`.

The Blueprint uses Node.js 22.12.0, installs the backend and frontend from their lockfiles, builds the frontend, then starts the backend. No `VITE_WS_URL` is needed in production; the app connects to the WebSocket server on the same origin.

The service runs without a database, but active rooms are held in memory and will be lost when the service restarts or sleeps. A configured `DATABASE_URL` enables the backend's database writes, but does not restore active rooms after a restart. Render's free web service can also spin down when idle, disconnecting participants.
