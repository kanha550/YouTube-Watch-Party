import React, { useState } from 'react';
import { X, Hand, Film, Play, Pause, FastForward, Shield } from 'lucide-react';
import type { ActionRequestType } from '../../types';

interface ParticipantRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitRequest: (action: ActionRequestType, payload: any) => void;
  currentVideoTime: number;
}

export const ParticipantRequestModal: React.FC<ParticipantRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmitRequest,
  currentVideoTime
}) => {
  const [actionType, setActionType] = useState<ActionRequestType>('change_video');
  const [videoUrl, setVideoUrl] = useState('');
  const [seekTime, setSeekTime] = useState<number>(Math.floor(currentVideoTime));
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { note: note.trim() };

    if (actionType === 'change_video') {
      if (!videoUrl.trim()) return;
      payload.url = videoUrl.trim();
    } else if (actionType === 'seek') {
      payload.time = Number(seekTime);
    }

    onSubmitRequest(actionType, payload);
    onClose();
    setVideoUrl('');
    setNote('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title-row">
            <Hand className="w-5 h-5 text-indigo-400" />
            <h3>Request Action from Host / Mod</h3>
          </div>
          <button onClick={onClose} className="modal-close-btn" aria-label="Close modal">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="modal-description">
          As a participant, your request will be sent to the Host and Moderators.
          Once approved, the action will apply to the entire room!
        </p>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="modal-label">Choose Action</label>
          <div className="action-type-selector">
            <button
              type="button"
              className={`action-chip ${actionType === 'change_video' ? 'active' : ''}`}
              onClick={() => setActionType('change_video')}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Change Video</span>
            </button>
            <button
              type="button"
              className={`action-chip ${actionType === 'play' ? 'active' : ''}`}
              onClick={() => setActionType('play')}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Resume Play</span>
            </button>
            <button
              type="button"
              className={`action-chip ${actionType === 'pause' ? 'active' : ''}`}
              onClick={() => setActionType('pause')}
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
            <button
              type="button"
              className={`action-chip ${actionType === 'seek' ? 'active' : ''}`}
              onClick={() => setActionType('seek')}
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Jump to Time</span>
            </button>
            <button
              type="button"
              className={`action-chip ${actionType === 'request_mod' ? 'active' : ''}`}
              onClick={() => setActionType('request_mod')}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Become Mod</span>
            </button>
          </div>

          {actionType === 'change_video' && (
            <div className="form-group">
              <label>YouTube Video URL or ID</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {actionType === 'seek' && (
            <div className="form-group">
              <label>Jump to Timestamp (seconds)</label>
              <input
                type="number"
                min={0}
                value={seekTime}
                onChange={(e) => setSeekTime(Number(e.target.value))}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Reason / Note (optional)</label>
            <input
              type="text"
              placeholder="e.g. 'Check out this awesome soundtrack!'"
              maxLength={100}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
