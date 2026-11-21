import React, { useState } from 'react';
import { Users, MoreVertical, Crown, ShieldAlert, UserMinus, ShieldCheck } from 'lucide-react';
import { RoleBadge } from '../common/RoleBadge';
import type { Participant, Role } from '../../types';

interface ParticipantListProps {
  participants: Participant[];
  self: Participant | null;
  hostId: string;
  isHost: boolean;
  onAssignRole: (userId: string, role: Role) => void;
  onRemoveParticipant: (userId: string) => void;
  onTransferHost: (userId: string) => void;
}

export const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  self,
  isHost,
  onAssignRole,
  onRemoveParticipant,
  onTransferHost
}) => {
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  const toggleMenu = (userId: string) => {
    setActiveMenuUserId((prev) => (prev === userId ? null : userId));
  };

  return (
    <div className="participants-panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <Users className="w-4 h-4 text-indigo-400" />
          <h3>Participants</h3>
        </div>
        <span className="count-pill">{participants.length}</span>
      </div>

      <div className="participants-scroll">
        {participants.map((person) => {
          const isSelf = person.id === self?.id;
          const isUserHost = person.role === 'host';
          const isUserMod = person.role === 'moderator';
          const isMenuOpen = activeMenuUserId === person.id;

          return (
            <div key={person.id} className={`participant-row ${isSelf ? 'is-self' : ''}`}>
              <div className="participant-avatar">
                {person.username.charAt(0).toUpperCase()}
              </div>

              <div className="participant-info">
                <div className="participant-name-line">
                  <span className="participant-username">{person.username}</span>
                  {isSelf && <span className="you-pill">You</span>}
                </div>
                <RoleBadge role={person.role} size="sm" />
              </div>

              {/* Host management actions menu for other members */}
              {isHost && !isSelf && (
                <div className="participant-actions-wrap">
                  <button
                    type="button"
                    onClick={() => toggleMenu(person.id)}
                    className="menu-trigger-btn"
                    title="Manage participant"
                    aria-label="Manage participant"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {isMenuOpen && (
                    <div className="actions-dropdown">
                      {isUserMod ? (
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            onAssignRole(person.id, 'participant');
                            setActiveMenuUserId(null);
                          }}
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-400" />
                          <span>Demote to Viewer</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            onAssignRole(person.id, 'moderator');
                            setActiveMenuUserId(null);
                          }}
                        >
                          <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          <span>Promote to Moderator</span>
                        </button>
                      )}

                      {!isUserHost && (
                        <button
                          type="button"
                          className="dropdown-item"
                          onClick={() => {
                            if (window.confirm(`Transfer host role to ${person.username}? You will become a Moderator.`)) {
                              onTransferHost(person.id);
                              setActiveMenuUserId(null);
                            }
                          }}
                        >
                          <Crown className="w-4 h-4 text-amber-400" />
                          <span>Make Room Host</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="dropdown-item danger"
                        onClick={() => {
                          if (window.confirm(`Remove ${person.username} from this room?`)) {
                            onRemoveParticipant(person.id);
                            setActiveMenuUserId(null);
                          }
                        }}
                      >
                        <UserMinus className="w-4 h-4 text-rose-400" />
                        <span>Remove from Room</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
