import { ROLES } from '../config.js';

export class RBACService {
  /**
   * Can user control video playback (play, pause, seek)?
   * Permitted: Host and Moderator.
   */
  static canControlPlayback(role) {
    return role === ROLES.HOST || role === ROLES.MODERATOR;
  }

  /**
   * Can user change the active video?
   * Permitted: Host and Moderator.
   */
  static canChangeVideo(role) {
    return role === ROLES.HOST || role === ROLES.MODERATOR;
  }

  /**
   * Can user assign roles to others?
   * Permitted: Host only.
   */
  static canAssignRole(callerRole, targetUser, newRole) {
    if (callerRole !== ROLES.HOST) return false;
    if (!targetUser) return false;
    // Host cannot demote themselves through assign_role (must use transfer_host)
    if (targetUser.role === ROLES.HOST) return false;
    // Valid roles to assign are moderator and participant
    return [ROLES.MODERATOR, ROLES.PARTICIPANT].includes(newRole);
  }

  /**
   * Can caller remove a participant from room?
   * Permitted: Host only. Host cannot remove themselves.
   */
  static canRemoveParticipant(callerRole, targetUser) {
    if (callerRole !== ROLES.HOST) return false;
    if (!targetUser) return false;
    if (targetUser.role === ROLES.HOST) return false;
    return true;
  }

  /**
   * Can caller transfer host rights to another user?
   * Permitted: Host only. Target must exist and not already be host.
   */
  static canTransferHost(callerRole, targetUser) {
    if (callerRole !== ROLES.HOST) return false;
    if (!targetUser) return false;
    if (targetUser.role === ROLES.HOST) return false;
    return true;
  }

  /**
   * Can user review and resolve participant action requests?
   * Permitted: Host and Moderator.
   */
  static canResolveRequest(role) {
    return role === ROLES.HOST || role === ROLES.MODERATOR;
  }
}
