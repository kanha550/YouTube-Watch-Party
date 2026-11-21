import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Link2, Hand, Lock } from 'lucide-react';
import { formatSeconds } from '../../utils/formatters';

interface PlaybackControlsProps {
  canControl: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onChangeVideo: (url: string) => void;
  onRequestAction: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  canControl,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onSeek,
  onChangeVideo,
  onRequestAction
}) => {
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const handleVideoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrlInput.trim()) return;
    onChangeVideo(videoUrlInput.trim());
    setVideoUrlInput('');
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(Number(e.target.value));
  };

  const handleSliderCommit = () => {
    setIsScrubbing(false);
    onSeek(scrubValue);
  };

  const effectiveTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (effectiveTime / duration) * 100 : 0;

  return (
    <div className="playback-panel">
      {/* Upper bar: Video change (for Host/Mod) or viewer notification & Request button (for Participant) */}
      <div className="playback-top-row">
        {canControl ? (
          <form onSubmit={handleVideoSubmit} className="video-change-form">
            <div className="video-url-input-wrap">
              <Link2 className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Paste YouTube URL or video ID to change video for everyone..."
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
              />
            </div>
            <button type="submit" className="load-video-btn" disabled={!videoUrlInput.trim()}>
              Change Video
            </button>
          </form>
        ) : (
          <div className="viewer-restriction-banner">
            <div className="restriction-text">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>
                <strong>Viewer Mode:</strong> Playback is synchronized by Host & Moderators.
              </span>
            </div>
            <button
              type="button"
              onClick={onRequestAction}
              className="request-action-btn"
              title="Request a video change or playback action"
            >
              <Hand className="w-4 h-4" />
              <span>Request Change</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Playback Bar */}
      <div className="controls-bar">
        {/* Play / Pause Toggle */}
        <div className="playback-buttons">
          {canControl ? (
            isPlaying ? (
              <button
                type="button"
                onClick={onPause}
                className="control-icon-btn play-pause-btn"
                title="Pause (space)"
                aria-label="Pause"
              >
                <Pause className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlay}
                className="control-icon-btn play-pause-btn"
                title="Play (space)"
                aria-label="Play"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )
          ) : (
            <div className="disabled-play-indicator" title="Controls restricted to Host & Moderator">
              {isPlaying ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-slate-400" />}
            </div>
          )}

          {canControl && (
            <button
              type="button"
              onClick={() => onSeek(0)}
              className="control-icon-btn"
              title="Restart video"
              aria-label="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Time Scrubber */}
        <div className="scrubber-container">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={effectiveTime}
            disabled={!canControl}
            onMouseDown={() => {
              if (canControl) {
                setIsScrubbing(true);
                setScrubValue(currentTime);
              }
            }}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className={`timeline-slider ${!canControl ? 'disabled' : ''}`}
            style={{
              background: `linear-gradient(to right, #6366f1 ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`
            }}
          />
        </div>

        {/* Time Stamp */}
        <div className="time-display">
          <span className="current-time">{formatSeconds(effectiveTime)}</span>
          <span className="time-separator">/</span>
          <span className="total-duration">{formatSeconds(duration)}</span>
        </div>
      </div>
    </div>
  );
};
