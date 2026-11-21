import React, { useState } from 'react';
import { Copy, Check, Share2, LogOut, Radio } from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import type { Participant } from '../../types';

interface NavbarProps {
  roomId: string;
  self: Participant | null;
  isConnected: boolean;
  onLeaveRoom: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomId,
  self,
  isConnected,
  onLeaveRoom
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="brand">
          <div className="brand-icon">▶</div>
          <span className="brand-name">SyncParty</span>
        </div>

        <div className="room-code-tag">
          <span className="room-label">ROOM</span>
          <strong className="room-code">{roomId}</strong>
          <button
            onClick={copyRoomCode}
            className="icon-button"
            title="Copy room code"
            aria-label="Copy room code"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <button onClick={copyInviteLink} className="invite-button">
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Share Invite</span>
            </>
          )}
        </button>
      </div>

      <div className="navbar-right">
        <div className="connection-status" title={isConnected ? 'Connected' : 'Connecting...'}>
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'live-ping' : 'offline-ping'}`} />
          <span className="status-text">{isConnected ? 'LIVE SYNC' : 'CONNECTING'}</span>
        </div>

        {self && (
          <div className="user-profile-badge">
            <div className="user-avatar-mini">
              {self.username.charAt(0).toUpperCase()}
            </div>
            <span className="user-name-text">{self.username}</span>
            <RoleBadge role={self.role} size="sm" />
          </div>
        )}

        <button onClick={onLeaveRoom} className="leave-button" title="Leave room">
          <LogOut className="w-4 h-4" />
          <span>Leave</span>
        </button>
      </div>
    </header>
  );
};
