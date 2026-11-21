# 🎨 YouTube Watch Party — Frontend

Client-side application built with **React 19, TypeScript, and Vite**.

## 📁 Directory Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── Chat/            # Live chat with role badges & quick emojis
│   │   ├── Controls/        # Scrubber bar, play/pause, time, video loader
│   │   ├── Header/          # Navbar, room code pill, share invite link
│   │   ├── Landing/         # Room creation & room code join screen
│   │   ├── Participants/    # Participant roster & Host action menus
│   │   ├── Requests/        # Action request modal & Host approval drawer
│   │   ├── VideoPlayer/     # Responsive 16:9 YouTube iframe container
│   │   └── common/          # Role badges, status indicators
│   ├── hooks/
│   │   ├── useWatchParty.ts    # Room state, chat messages, permissions
│   │   └── useYouTubePlayer.ts # YouTube IFrame API sync & loop prevention
│   ├── services/
│   │   └── websocket.ts        # WebSocket client with auto-reconnection
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces & types
│   ├── utils/
│   │   ├── formatters.ts       # Time formatting (02:45)
│   │   └── youtube.ts          # Video ID parser & thumbnail URL generator
│   ├── App.tsx
│   ├── index.css               # Sleek dark theme UI styling
│   └── main.tsx
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 🚀 Running the Frontend Standalone

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Build for production
npm run build
```

Default dev server: `http://localhost:5173`
Proxies API requests and connects to backend WebSockets at `ws://localhost:3001`.
