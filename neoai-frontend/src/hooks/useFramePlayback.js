import { useEffect, useRef, useState } from "react";

export function useFramePlayback({ viewerMode, activeVideoFramesLength, totalFrames }) {
  const playbackTimerRef = useRef(0);
  const [fps, setFps] = useState(10);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    window.clearInterval(playbackTimerRef.current);

    if (viewerMode !== "video" || !isPlaying || activeVideoFramesLength === 0) {
      return undefined;
    }

    playbackTimerRef.current = window.setInterval(() => {
      setCurrentFrame((current) => {
        const nextFrame = Math.min(current + 1, totalFrames - 1);

        if (nextFrame >= totalFrames - 1) {
          window.clearInterval(playbackTimerRef.current);
          setIsPlaying(false);
        }

        return nextFrame;
      });
    }, Math.max(16, Math.round(1000 / fps)));

    return () => {
      window.clearInterval(playbackTimerRef.current);
    };
  }, [activeVideoFramesLength, fps, isPlaying, totalFrames, viewerMode]);

  useEffect(() => {
    return () => {
      window.clearInterval(playbackTimerRef.current);
    };
  }, []);

  function stopPlayback() {
    setIsPlaying(false);
  }

  function togglePlayback() {
    setIsPlaying((current) => !current);
  }

  function adjustFps(delta) {
    setFps((current) => Math.max(1, Math.min(60, current + delta)));
  }

  return {
    fps,
    setFps,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    stopPlayback,
    togglePlayback,
    adjustFps
  };
}
