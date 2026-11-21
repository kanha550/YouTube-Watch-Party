import { useState, useEffect, useCallback, useRef } from 'react';
import { wsClient } from '../services/websocket';
import type { Participant, VideoState, ChatMessage, ActionRequest, Role } from '../types';

export function useWatchParty() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [hostId, setHostId] = useState('');
  const [self, setSelf] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    videoId: 'jfKfPfyJRdk',
    currentTime: 0,
    playing: false,
    updatedAt: Date.now()
  });
  const [pendingRequests, setPendingRequests] = useState<ActionRequest[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const pendingSelfId = useRef<string | null>(null);
  const selfRef = useRef<Participant | null>(null);
  selfRef.current = self;

  // Show a momentary toast notification
  const notify = useCallback((title: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage({ title, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.title === title ? null : prev));
    }, 4000);
  }, []);

  useEffect(() => {
    // Initial connection to websocket
    wsClient.connect();

    const unsubConnection = wsClient.on('connection_change', ({ connected }) => {
      setIsConnected(connected);
    });

    const unsubRoomJoined = wsClient.on('room_joined', (data) => {
      setInRoom(true);
      setRoomId(data.roomId);
      setHostId(data.hostId);
      setSelf(data.self);
      pendingSelfId.current = data.self.id;
      setParticipants(data.participants || []);
      if (data.state) setVideoState(data.state);
      if (data.pendingRequests) setPendingRequests(data.pendingRequests);
      if (data.chatMessages) setChatMessages(data.chatMessages);

      // Update URL with room parameter without full reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', data.roomId);
      window.history.replaceState({}, '', newUrl.toString());

      notify(`Welcome to Room ${data.roomId}! You are ${data.self.role.toUpperCase()}`, 'success');
    });

    const unsubUserJoined = wsClient.on('user_joined', (data) => {
      setParticipants(data.participants || []);
      notify(`${data.user.username} joined the party`, 'info');
    });

    const unsubUserLeft = wsClient.on('user_left', (data) => {
      setParticipants(data.participants || []);
      notify(`${data.username || 'A participant'} left the room`, 'info');
    });

    const unsubSyncState = wsClient.on('sync_state', (data) => {
      if (data.state) {
        setVideoState(data.state);
      }
    });

    const unsubRoleAssigned = wsClient.on('role_assigned', (data) => {
      setParticipants(data.participants || []);
      if (selfRef.current && data.userId === selfRef.current.id) {
        setSelf((prev) => (prev ? { ...prev, role: data.role } : null));
        notify(`Your role was changed to ${data.role.toUpperCase()}`, 'warning');
      }
    });

    const unsubHostTransferred = wsClient.on('host_transferred', (data) => {
      setHostId(data.newHostId);
      setParticipants(data.participants || []);
      if (selfRef.current && data.newHostId === selfRef.current.id) {
        setSelf((prev) => (prev ? { ...prev, role: 'host' } : null));
        notify('You are now the Host of this room! 👑', 'success');
      }
    });

    const unsubRemoved = wsClient.on('participant_removed', (data) => {
      if (data.kicked) {
        alert(data.message || 'You were removed from the room by the host.');
        leaveRoom();
        return;
      }
      setParticipants(data.participants || []);
    });

    const unsubActionReqCreated = wsClient.on('action_request_created', (data) => {
      setPendingRequests(data.pendingRequests || []);
      notify(`New request from ${data.request.username}: ${data.request.action.replace('_', ' ')}`, 'info');
    });

    const unsubActionReqResolved = wsClient.on('action_request_resolved', (data) => {
      setPendingRequests(data.pendingRequests || []);
    });

    const unsubChat = wsClient.on('chat_message', (data) => {
      if (data.message) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    });

    const unsubError = wsClient.on('error', (data) => {
      setErrorMessage(data.message || 'An error occurred.');
    });

    return () => {
      unsubConnection();
      unsubRoomJoined();
      unsubUserJoined();
      unsubUserLeft();
      unsubSyncState();
      unsubRoleAssigned();
      unsubHostTransferred();
      unsubRemoved();
      unsubActionReqCreated();
      unsubActionReqResolved();
      unsubChat();
      unsubError();
    };
  }, [notify]);

  // Actions
  const createRoom = useCallback((username: string, initialVideo?: string) => {
    setErrorMessage(null);
    wsClient.send('create_room', { username, initialVideo });
  }, []);

  const joinRoom = useCallback((code: string, username: string) => {
    setErrorMessage(null);
    wsClient.send('join_room', { roomId: code, username });
  }, []);

  const leaveRoom = useCallback(() => {
    wsClient.send('leave_room');
    setInRoom(false);
    setRoomId('');
    setSelf(null);
    setParticipants([]);
    setPendingRequests([]);
    setChatMessages([]);

    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('room');
    window.history.replaceState({}, '', newUrl.toString());
  }, []);

  const sendPlay = useCallback((currentTime: number) => {
    wsClient.send('play', { currentTime });
  }, []);

  const sendPause = useCallback((currentTime: number) => {
    wsClient.send('pause', { currentTime });
  }, []);

  const sendSeek = useCallback((time: number) => {
    wsClient.send('seek', { time });
  }, []);

  const sendChangeVideo = useCallback((url: string) => {
    wsClient.send('change_video', { url });
  }, []);

  const sendAssignRole = useCallback((userId: string, role: Role) => {
    wsClient.send('assign_role', { userId, role });
  }, []);

  const sendRemoveParticipant = useCallback((userId: string) => {
    wsClient.send('remove_participant', { userId });
  }, []);

  const sendTransferHost = useCallback((userId: string) => {
    wsClient.send('transfer_host', { userId });
  }, []);

  const sendActionRequest = useCallback((action: string, payload: any) => {
    wsClient.send('action_request', { action, payload });
  }, []);

  const sendResolveRequest = useCallback((requestId: string, approved: boolean) => {
    wsClient.send('resolve_request', { requestId, approved });
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    wsClient.send('chat_message', { text });
  }, []);

  const canControl = self?.role === 'host' || self?.role === 'moderator';
  const isHost = self?.role === 'host';

  return {
    inRoom,
    roomId,
    hostId,
    self,
    participants,
    videoState,
    pendingRequests,
    chatMessages,
    isConnected,
    errorMessage,
    toastMessage,
    canControl,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    sendPlay,
    sendPause,
    sendSeek,
    sendChangeVideo,
    sendAssignRole,
    sendRemoveParticipant,
    sendTransferHost,
    sendActionRequest,
    sendResolveRequest,
    sendChatMessage,
    dismissError: () => setErrorMessage(null)
  };
}
