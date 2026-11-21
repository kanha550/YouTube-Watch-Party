import React from 'react';
import { Bell, Check, X, Film, Play, Pause, FastForward, Shield } from 'lucide-react';
import type { ActionRequest } from '../../types';

interface RequestApprovalDrawerProps {
  canResolve: boolean;
  requests: ActionRequest[];
  onResolve: (requestId: string, approved: boolean) => void;
}

export const RequestApprovalDrawer: React.FC<RequestApprovalDrawerProps> = ({
  canResolve,
  requests,
  onResolve
}) => {
  if (!canResolve || requests.length === 0) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'change_video':
        return <Film className="w-4 h-4 text-rose-400" />;
      case 'play':
        return <Play className="w-4 h-4 text-emerald-400" />;
      case 'pause':
        return <Pause className="w-4 h-4 text-amber-400" />;
      case 'seek':
        return <FastForward className="w-4 h-4 text-indigo-400" />;
      case 'request_mod':
        return <Shield className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-sky-400" />;
    }
  };

  const getActionSummary = (req: ActionRequest) => {
    switch (req.action) {
      case 'change_video':
        return `Wants to load video: ${req.payload.url || req.payload.videoId}`;
      case 'play':
        return `Wants to resume playback`;
      case 'pause':
        return `Wants to pause video`;
      case 'seek':
        return `Wants to jump to ${req.payload.time}s`;
      case 'request_mod':
        return `Requests Moderator role`;
      default:
        return `Requested ${req.action}`;
    }
  };

  return (
    <div className="approval-card-float">
      <div className="approval-card-header">
        <div className="approval-header-left">
          <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
          <span className="approval-title">Pending Requests</span>
          <span className="approval-count">{requests.length}</span>
        </div>
      </div>

      <div className="approval-list">
        {requests.map((req) => (
          <div key={req.id} className="approval-item">
            <div className="approval-icon-col">{getActionIcon(req.action)}</div>

            <div className="approval-info-col">
              <div className="approval-user-line">
                <strong className="approval-username">{req.username}</strong>
                <span className="approval-action-badge">{req.action.replace('_', ' ')}</span>
              </div>
              <p className="approval-detail-text">{getActionSummary(req)}</p>
              {req.payload.note && (
                <p className="approval-note-text">"{req.payload.note}"</p>
              )}
            </div>

            <div className="approval-actions-col">
              <button
                type="button"
                onClick={() => onResolve(req.id, true)}
                className="approval-btn approve"
                title="Approve request"
              >
                <Check className="w-4 h-4" />
                <span>Approve</span>
              </button>
              <button
                type="button"
                onClick={() => onResolve(req.id, false)}
                className="approval-btn reject"
                title="Reject request"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
