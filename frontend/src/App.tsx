import React, { useState, useEffect } from 'react';
import { useWatchParty } from './hooks/useWatchParty';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';
import { LandingPage } from './components/Landing/LandingPage';
import { Navbar } from './components/Header/Navbar';
import { VideoContainer } from './components/VideoPlayer/VideoContainer';
import { PlaybackControls } from './components/Controls/PlaybackControls';
import { ParticipantList } from './components/Participants/ParticipantList';
import { ChatPanel } from './components/Chat/ChatPanel';
import { RequestApprovalDrawer } from './components/Requests/RequestApprovalDrawer';
import { ParticipantRequestModal } from './components/Requests/ParticipantRequestModal';

export const App: React.FC = () => {
  const {
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
    dismissError
  } = useWatchParty();

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'participants' | 'chat'>('chat');

  // YouTube player hook
  const {
    isReady,
    isPlaying,
    currentTime,
    duration,
    syncWithServer,
    seekTo,
    playVideo,
    pauseVideo
  } = useYouTubePlayer({
    containerId: 'youtube-party-player',
    initialVideoId: videoState.videoId,
    canControl,
    isActive: inRoom,
    onUserPlay: (time) => sendPlay(time),
    onUserPause: (time) => sendPause(time),
    onUserSeek: (time) => sendSeek(time)
  });

  // When server broadcasts new videoState, sync the YouTube player
  useEffect(() => {
    if (inRoom && isReady) {
      syncWithServer(videoState);
    }
  }, [videoState, inRoom, isReady, syncWithServer]);

  // If not in room, show the landing page
  if (!inRoom) {
    return (
      <LandingPage
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        errorMessage={errorMessage}
        onClearError={dismissError}
      />
    );
  }

  return (
    <div className="party-app">
      {/* Top Navbar */}
      <Navbar
        roomId={roomId}
        self={self}
        isConnected={isConnected}
        onLeaveRoom={leaveRoom}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`toast-alert toast-${toastMessage.type}`}>
          <span>{toastMessage.title}</span>
        </div>
      )}

      {/* Main Party Room Grid */}
      <main className="party-main-grid">
        {/* Left Column: Video Stage + Controls */}
        <section className="stage-section">
          <VideoContainer
            containerId="youtube-party-player"
            isReady={isReady}
            isPlaying={isPlaying}
            videoId={videoState.videoId}
          />

          <PlaybackControls
            canControl={canControl}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlay={() => {
              playVideo();
              sendPlay(currentTime);
            }}
            onPause={() => {
              pauseVideo();
              sendPause(currentTime);
            }}
            onSeek={(newTime) => {
              seekTo(newTime);
              sendSeek(newTime);
            }}
            onChangeVideo={sendChangeVideo}
            onRequestAction={() => setIsRequestModalOpen(true)}
          />
        </section>

        {/* Right Column: Sidebar (Participants & Chat) */}
        <aside className="sidebar-section">
          <div className="sidebar-tabs">
            <button
              type="button"
              className={`side-tab ${activeSideTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveSideTab('chat')}
            >
              Party Chat
            </button>
            <button
              type="button"
              className={`side-tab ${activeSideTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveSideTab('participants')}
            >
              Participants ({participants.length})
            </button>
          </div>

          <div className="sidebar-content">
            {activeSideTab === 'chat' ? (
              <ChatPanel
                messages={chatMessages}
                self={self}
                onSendMessage={sendChatMessage}
              />
            ) : (
              <ParticipantList
                participants={participants}
                self={self}
                hostId={hostId}
                isHost={isHost}
                onAssignRole={sendAssignRole}
                onRemoveParticipant={sendRemoveParticipant}
                onTransferHost={sendTransferHost}
              />
            )}
          </div>
        </aside>
      </main>

      {/* Host & Mod Pending Approval Drawer */}
      <RequestApprovalDrawer
        canResolve={canControl}
        requests={pendingRequests}
        onResolve={sendResolveRequest}
      />

      {/* Participant Action Request Modal */}
      <ParticipantRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSubmitRequest={sendActionRequest}
        currentVideoTime={currentTime}
      />
    </div>
  );
};

export default App;
