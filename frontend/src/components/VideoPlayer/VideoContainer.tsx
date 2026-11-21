import React from 'react';
import { Radio } from 'lucide-react';

interface VideoContainerProps {
  containerId: string;
  isReady: boolean;
  isPlaying: boolean;
  videoId: string;
}

export const VideoContainer: React.FC<VideoContainerProps> = ({
  containerId,
  isReady,
  isPlaying,
  videoId
}) => {
  return (
    <div className="video-player-wrapper">
      <div className="video-aspect-box">
        {/* The YouTube iframe will be mounted into this div by the YouTube Iframe API */}
        <div id={containerId} className="youtube-player-mount" />

        {!isReady && (
          <div className="player-loading-skeleton">
            <div className="loading-spinner" />
            <p>Loading YouTube Player...</p>
          </div>
        )}
      </div>

      <div className="video-meta-bar">
        <div className="meta-left">
          <span className="live-pill">
            <Radio className="w-3 h-3 live-ping" />
            SYNCHRONIZED
          </span>
          <span className="video-id-text">Video ID: <code>{videoId}</code></span>
        </div>

        <div className="meta-right">
          <span className={`status-pill ${isPlaying ? 'playing' : 'paused'}`}>
            {isPlaying ? '● Playing' : '❚❚ Paused'}
          </span>
        </div>
      </div>
    </div>
  );
};
