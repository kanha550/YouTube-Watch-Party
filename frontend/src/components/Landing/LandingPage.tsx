import React, { useState, useEffect } from 'react';
import { Film, PlayCircle, Users, Sparkles, ArrowRight, Video } from 'lucide-react';

interface LandingPageProps {
  onCreateRoom: (username: string, initialVideo?: string) => void;
  onJoinRoom: (roomId: string, username: string) => void;
  errorMessage: string | null;
  onClearError: () => void;
}

const PRESET_VIDEOS = [
  { label: '☕ Lofi Chill Beats', id: 'rFZHOHl-L8A' },
  { label: '🌆 Synthwave Radio', id: '4xDzrJKXOOY' },
  { label: '🐰 Big Buck Bunny', id: 'aqz-KE-bpKQ' },
  { label: '🌊 Nature 4K Scenic', id: 'BHACKCNDMW8' }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onCreateRoom,
  onJoinRoom,
  errorMessage,
  onClearError
}) => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [customVideo, setCustomVideo] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('rFZHOHl-L8A');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-detect room code from URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase());
      setMode('join');
    }
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    onClearError();

    const cleanName = username.trim();
    if (!cleanName) {
      setValidationError('Please enter a display name to continue.');
      return;
    }

    const videoToUse = customVideo.trim() || selectedPreset;
    onCreateRoom(cleanName, videoToUse);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    onClearError();

    const cleanName = username.trim();
    const cleanCode = roomCode.trim().toUpperCase();

    if (!cleanName) {
      setValidationError('Please enter your display name.');
      return;
    }
    if (!cleanCode) {
      setValidationError('Please enter a valid 6-character room code.');
      return;
    }

    onJoinRoom(cleanCode, cleanName);
  };

  const currentError = validationError || errorMessage;

  return (
    <div className="landing-container">
      <div className="landing-content">
        {/* Brand / Hero */}
        <div className="landing-hero">
          <div className="brand-badge">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>REAL-TIME SYNCHRONIZED STREAMING</span>
          </div>

          <h1 className="hero-title">
            Watch YouTube Together,<br />
            <span className="gradient-text">Down to the Millisecond.</span>
          </h1>

          <p className="hero-subtitle">
            Create an instant watch party with friends. Synchronized playback, 
            granular role permissions (Host, Moderator, Viewer), and live chat.
          </p>

          <div className="features-pill-row">
            <div className="feature-pill">
              <Film className="w-3.5 h-3.5 text-rose-400" />
              <span>Full YouTube Embed</span>
            </div>
            <div className="feature-pill">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Host & Mod Controls</span>
            </div>
            <div className="feature-pill">
              <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero-Drift Playback</span>
            </div>
          </div>
        </div>

        {/* Entry Card */}
        <div className="entry-card">
          <div className="card-tabs">
            <button
              type="button"
              className={`tab-btn ${mode === 'create' ? 'active' : ''}`}
              onClick={() => {
                setMode('create');
                setValidationError(null);
              }}
            >
              Create New Room
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'join' ? 'active' : ''}`}
              onClick={() => {
                setMode('join');
                setValidationError(null);
              }}
            >
              Join Existing Room
            </button>
          </div>

          {currentError && (
            <div className="error-banner">
              <span>{currentError}</span>
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreate} className="entry-form">
              <div className="form-group">
                <label htmlFor="create-username">Your Display Name</label>
                <input
                  id="create-username"
                  type="text"
                  placeholder="e.g. Alex, Maya, CyberGhost"
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label>Starting Video</label>
                <div className="preset-grid">
                  {PRESET_VIDEOS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`preset-btn ${selectedPreset === p.id && !customVideo ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedPreset(p.id);
                        setCustomVideo('');
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="custom-video-input-wrapper">
                  <Video className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Or paste any YouTube video URL"
                    value={customVideo}
                    onChange={(e) => setCustomVideo(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn primary">
                <span>Launch Watch Party</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="entry-form">
              <div className="form-group">
                <label htmlFor="join-username">Your Display Name</label>
                <input
                  id="join-username"
                  type="text"
                  placeholder="e.g. Alex, Maya, CyberGhost"
                  maxLength={24}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="join-roomcode">6-Character Room Code</label>
                <input
                  id="join-roomcode"
                  type="text"
                  placeholder="e.g. A9B2X7"
                  maxLength={10}
                  className="room-code-input"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  required
                />
              </div>

              <button type="submit" className="submit-btn secondary">
                <span>Join Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
