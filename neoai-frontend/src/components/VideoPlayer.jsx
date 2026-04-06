import React, { useRef, useState } from "react";

export default function VideoPlayer({ video, onFrameSelect }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [currentFrame, setCurrentFrame] = useState(null);

  // Grab the current frame from the video
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

  return (
    <div className="video-container">
      <h3>{video.name || "Video"}</h3>
      {/*Hata veriyor Uncaught DOMException: The operation is insecure. */}
      <video
  ref={videoRef}
  src={video.url}
  crossOrigin="anonymous" 
  controls
  style={{ maxWidth: "600px", display: "block" }}
/>
      <button onClick={captureFrame}>Capture Current Frame</button>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {currentFrame && (
        <div>
          <h4>Selected Frame:</h4>
          <img src={currentFrame} alt="Captured frame" style={{ maxWidth: "300px" }} />
        </div>
      )}
    </div>
  );
}