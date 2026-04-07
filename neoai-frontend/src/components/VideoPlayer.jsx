import React, { useRef, useState, useEffect } from 'react';

export default function VideoPlayer({ url, videoRef }) {
  const currentRef = videoRef || useRef(null);
  const scrollRef = useRef(null);
  const [fps, setFps] = useState(0);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  // Measure FPS using requestVideoFrameCallback
  const measureFps = () => {
    const videoEl = currentRef.current;
    if (!videoEl || !videoEl.requestVideoFrameCallback) return;

    let lastTime = performance.now();
    let frameCount = 0;

    const cb = () => {
      const now = performance.now();
      frameCount++;
      const delta = (now - lastTime) / 1000; // seconds
      if (delta >= 1) {
        setFps(frameCount / delta);
        frameCount = 0;
        lastTime = now;
      }
      videoEl.requestVideoFrameCallback(cb);
    };

    videoEl.requestVideoFrameCallback(cb);
  };

  // Setup total frames when metadata is loaded
  const onLoadedMetadata = () => {
    measureFps();
    const videoEl = currentRef.current;
    if (videoEl && fps) {
      setTotalFrames(Math.floor(videoEl.duration * fps));
    }
  };

  // Frame navigation
  const seekFrame = (frameNumber) => {
    const videoEl = currentRef.current;
    if (!videoEl || !fps) return;
    const clampedFrame = Math.max(0, Math.min(frameNumber, totalFrames - 1));
    setCurrentFrameIndex(clampedFrame);
    videoEl.currentTime = clampedFrame / fps;
  };

  // Handle scroll
  const handleScroll = () => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !totalFrames) return;

    const scrollFraction =
      scrollEl.scrollLeft / (scrollEl.scrollWidth - scrollEl.clientWidth);
    const newFrame = Math.floor(scrollFraction * totalFrames);
    seekFrame(newFrame);
  };

  return (
    <div className="viewer-stage">
      <video
        ref={currentRef}
        src={url}
        preload="auto"
        controls={false}
        onLoadedMetadata={onLoadedMetadata}
        style={{ maxWidth: "600px", display: "block" }}
      />
      <div style={{ marginTop: '10px' }}>
        <span>FPS: {fps.toFixed(2)}</span>
        <span style={{ marginLeft: '20px' }}>Frame: {currentFrameIndex}</span>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          marginTop: '20px',
          overflowX: 'scroll',
          whiteSpace: 'nowrap',
          width: '600px',
          border: '1px solid #ccc',
          height: '20px',
        }}
      >
        <div style={{ width: `${totalFrames}px`, height: '100%' }} />
      </div>
    </div>
  );
}