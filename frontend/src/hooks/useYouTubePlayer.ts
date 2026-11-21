import { useEffect, useRef, useState, useCallback } from 'react';
import type { VideoState } from '../types';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface UseYouTubePlayerProps {
  containerId: string;
  initialVideoId: string;
  canControl: boolean;
  isActive: boolean;
  onUserPlay: (currentTime: number) => void;
  onUserPause: (currentTime: number) => void;
  onUserSeek?: (time: number) => void;
  onPlayerError?: (message: string) => void;
}

export function useYouTubePlayer({
  containerId,
  initialVideoId,
  canControl,
  isActive,
  onUserPlay,
  onUserPause,
  onPlayerError
}: UseYouTubePlayerProps) {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Tracks active video ID safely
  const currentVideoIdRef = useRef<string>(initialVideoId || 'jfKfPfyJRdk');
  // Flag to prevent feedback echo loops
  const isSyncingRef = useRef(false);
  const progressIntervalRef = useRef<any>(null);

  // Sync ref when initialVideoId changes
  useEffect(() => {
    if (initialVideoId && !playerRef.current) {
      currentVideoIdRef.current = initialVideoId;
    }
  }, [initialVideoId]);

  // Load YouTube Iframe API script
  useEffect(() => {
    const apiScriptLoaded = Array.from(document.scripts).some((script) =>
      script.src.includes('youtube.com/iframe_api')
    );
    if (!window.YT && !apiScriptLoaded) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize player once container is mounted into DOM
  useEffect(() => {
    if (!isActive) {
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }
      setIsReady(false);
      return;
    }

    let retryTimer: any = null;

    const initPlayer = () => {
      if (playerRef.current) return;
      if (!window.YT || !window.YT.Player) return;

      const container = document.getElementById(containerId);
      if (!container) return; // Wait until container DOM node mounts

      try {
        playerRef.current = new window.YT.Player(containerId, {
          videoId: currentVideoIdRef.current,
          playerVars: {
            autoplay: 1,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              setIsReady(true);
              const dur = event.target.getDuration ? event.target.getDuration() : 0;
              setDuration(dur || 0);

              // Auto-play initial video
              try {
                event.target.playVideo();
              } catch (_) {}
            },
            onStateChange: (event: any) => {
              const state = event.data;
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
                const dur = event.target.getDuration ? event.target.getDuration() : 0;
                if (dur) setDuration(dur);

                if (!isSyncingRef.current && canControl) {
                  const time = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;
                  onUserPlay(time);
                }
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);

                if (!isSyncingRef.current && canControl) {
                  const time = event.target.getCurrentTime ? event.target.getCurrentTime() : 0;
                  onUserPause(time);
                }
              } else if (state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
            },
            onError: (event: any) => {
              const code = event.data;
              console.warn('YouTube Player error code:', code);
              let msg = 'Unable to play this YouTube video.';
              if (code === 101 || code === 150) {
                msg = 'This video has embedding disabled by its creator. Please try another video.';
              } else if (code === 100) {
                msg = 'Video not found or removed from YouTube.';
              } else if (code === 2) {
                msg = 'Invalid YouTube video ID or URL parameter.';
              }
              onPlayerError?.(msg);
            }
          }
        });
      } catch (err) {
        console.error('Error creating YT.Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        initPlayer();
      };
    }

    // Polling retry in case container element takes a tick to render
    retryTimer = setInterval(() => {
      if (!playerRef.current) {
        initPlayer();
      } else {
        clearInterval(retryTimer);
      }
    }, 200);

    return () => {
      if (retryTimer) clearInterval(retryTimer);
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }
      setIsReady(false);
    };
  }, [isActive, containerId, canControl]);

  // Periodic time tracker for custom seekbar / time label
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        try {
          const time = playerRef.current.getCurrentTime() || 0;
          setCurrentTime(time);
          const dur = playerRef.current.getDuration() || 0;
          if (dur > 0 && dur !== duration) {
            setDuration(dur);
          }
        } catch (_) {}
      }
    }, 500);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [duration]);

  /**
   * Applies incoming server state smoothly
   */
  const syncWithServer = useCallback(
    (serverState: VideoState) => {
      const player = playerRef.current;
      if (!player || !isReady) return;

      isSyncingRef.current = true;

      try {
        // 1. If video changed, load the new video
        if (serverState.videoId && currentVideoIdRef.current !== serverState.videoId) {
          currentVideoIdRef.current = serverState.videoId;

          if (player.loadVideoById) {
            player.loadVideoById({
              videoId: serverState.videoId,
              startSeconds: serverState.currentTime || 0
            });
          }

          if (serverState.playing && player.playVideo) {
            player.playVideo();
          }
        } else {
          // 2. Drift correction: only seek if timestamp difference exceeds 1.5s
          const localTime = player.getCurrentTime ? player.getCurrentTime() : 0;
          const drift = Math.abs(localTime - serverState.currentTime);

          if (drift > 1.5 && player.seekTo) {
            player.seekTo(serverState.currentTime, true);
          }
        }

        // 3. Play / Pause state sync
        const currentPlayState = player.getPlayerState ? player.getPlayerState() : -1;
        if (serverState.playing) {
          if (currentPlayState !== window.YT.PlayerState.PLAYING && player.playVideo) {
            player.playVideo();
          }
        } else {
          if (currentPlayState === window.YT.PlayerState.PLAYING && player.pauseVideo) {
            player.pauseVideo();
          }
        }
      } catch (err) {
        console.error('Error applying server sync:', err);
      } finally {
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 800);
      }
    },
    [isReady]
  );

  const seekTo = useCallback((seconds: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  }, []);

  const playVideo = useCallback(() => {
    if (playerRef.current?.playVideo) {
      playerRef.current.playVideo();
    }
  }, []);

  const pauseVideo = useCallback(() => {
    if (playerRef.current?.pauseVideo) {
      playerRef.current.pauseVideo();
    }
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    syncWithServer,
    seekTo,
    playVideo,
    pauseVideo
  };
}
