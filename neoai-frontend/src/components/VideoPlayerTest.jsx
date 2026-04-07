import React, { useRef, useState, useEffect } from "react";

export default function VideoPlayerTest({ video, onFrameSelect, videoRef }) {
  const videoRef = videoRef || useRef(null);
  const canvasRef = useRef(null);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [fps, setFps] = useState(30); // default to 30
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Capture current frame
  const captureFrame = () => {
    const videoEl = videoRef.current;
    const canvas = canvasRef.current;
    if (!videoEl || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const frameData = canvas.toDataURL("image/png"); // Base64 image
    setCurrentFrame(frameData);
    if (onFrameSelect) onFrameSelect(frameData);
  };

  // Measure FPS using requestVideoFrameCallback
  const measureFps = () => {
    const videoEl = videoRef.current;
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

  // Frame navigation
  const seekFrame = (frameNumber) => {
    if (!videoRef.current || !fps) return;
    const totalFrames = Math.floor(videoRef.current.duration * fps);
    const clampedFrame = Math.max(0, Math.min(frameNumber, totalFrames - 1));
    setCurrentFrameIndex(clampedFrame);
    videoRef.current.currentTime = clampedFrame / fps;
  };

  const playVideo = () => videoRef.current?.play();
  const pauseVideo = () => videoRef.current?.pause();
  const seekTo = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
  };

  return (
    <div className="video-container">
      <h3>{video.name || "Video"}</h3>
      <video
        ref={videoRef}
        src={video.url}
        preload="auto"
        controls={false}
        style={{ maxWidth: "600px", display: "block" }}
        onLoadedMetadata={measureFps}
      />
      <div className="controls">
        <button onClick={() => seekFrame(currentFrameIndex - 1)}>Prev Frame</button>
        <button onClick={() => seekFrame(currentFrameIndex + 1)}>Next Frame</button>
        <button onClick={playVideo}>Play</button>
        <button onClick={pauseVideo}>Pause</button>
        <button onClick={() => seekTo(10)}>Go to 10s</button>
        <button onClick={captureFrame}>Capture Current Frame</button>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {currentFrame && (
        <div>
          <h4>Selected Frame:</h4>
          <img src={currentFrame} alt="Captured frame" style={{ maxWidth: "300px" }} />
        </div>
      )}
      <p>FPS: {fps?.toFixed(2)}</p>
    </div>
  );
}