import React from 'react'
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import ThreeColumnLayout from "../components/ThreeColumnLayout";
import { getVideos } from '../services/api';
import VideoPlayerTest from '../components/VideoPlayer';
import VideoPlayer from '../components/VideoPlayer';

export default function VideoTestPage() {
  const patientId = 1001;
  const examinationName = "EX_123";
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    async function loadVideos() {
      try {
        const data = await getVideos(patientId, examinationName);
        setVideos(data || []);
        console.log("Here be videos", data);
      } catch (err) {
        console.error("Get Videos Error:", err.message);
      }
    }
    loadVideos();
  }, []);

  const handleFrameSelect = (frameData) => {
    console.log("Frame selected:", frameData);
    // You could also convert to image:
    // const imageUrl = canvasRef.current.toDataURL();
  };
  const test = (video) => {
    console.log("Selected video:", video);
    console.log("Selected video:", video.url);
    setSelectedVideo(video);
  }

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    handleFrameSelect(frameData);
  };

  return (
    <div className="page-stack selection-page">
      <h2>Videos</h2>
      
      <div className="video-list">
        {videos.map((video, index) => (
          <button key={index} onClick={() => test(video)}>
            Video {index + 1}
          </button>
        ))}
      </div>

      {selectedVideo && (
        <VideoPlayer url={selectedVideo.url} />
        
      )}
    </div>
  );
}
/*
<div className="video-player">
          <video
            ref={videoRef}
            src={selectedVideo.url}
            crossOrigin="anonymous"
            style={{ maxWidth: "600px" }}
          />
          <button onClick={captureFrame}>Capture Current Frame</button>
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
*/