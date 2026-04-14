import React, { useState, useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import { getVideos } from "../services/api.js";
const videoStyles = `
  /* 1. Video Paneli: Her şeyi dikey sıraya sokar */
  .video-panel {
    display: flex !important;
    flex-direction: column !important; /* Üst üste dizilimi zorla */
    align-items: center !important;    /* Yatayda ortala */
    width: 100% !important;
    clear: both;                       /* Etraftaki kaymaları temizle */
  }

  /* 2. Oynatıcı Kutusu: Genişliği dizginle */
  [data-vjs-player] {
    width: 100%;
    max-width: 800px;                  /* Videoyu bu genişlikte sabitle */
    margin: 0 auto !important;         /* Ortala */
    aspect-ratio: 16 / 9;              /* Oranı koru */
    background-color: #000;
    border-radius: 12px;
    position: relative;
/
  /* 3. Gerçek Video Elementi: Yayılmayı önle */
  .video-js {
    width: 100% !important;
    height: 100% !important;
  }

  .video-js .vjs-tech {
    object-fit: contain !important;    /* Ultrasound görüntüsünü bozma */
  }

  /* 4. Buton Satırı: Videonun tam altında kalsın */
  .controls-row {
    width: 100%;
    display: flex !important;
    justify-content: center !important;
    flex-wrap: wrap;                   /* Küçük ekranlarda butonları alt alta al */
    margin-top: 25px !important;
    gap: 15px !important;
  }
`;
export default function VideoTestPage() {
  const patientId = 1001;
  const examinationName = "EX_123";
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const canvasRef = useRef(null);

  // 1. ADIM: Metadata Çekme
  useEffect(() => {
    async function loadVideos() {
      try {
        const data = await getVideos(patientId, examinationName);
        setVideos(data || []);
      } catch (err) {
        console.error("Get Videos Error:", err.message);
      }
    }
    loadVideos();
  }, []);

  // 2. ADIM: Video.js Lifecycle & Boyut Ayarı
  useEffect(() => {
    if (selectedVideo && videoRef.current) {
      // Eski player'ı DOM'dan temizle (Hata almamak için kritik)
      if (playerRef.current) {
        playerRef.current.dispose();
      }

      // Player başlatma
      playerRef.current = videojs(videoRef.current, {
        autoplay: false,
        controls: true,
        responsive: true,
        fluid: false, // Container genişliğine uyar
        fill: true, // Video boyutunu korur
        playbackRates: [0.5, 1, 1.5, 2],
        sources: [{
          src: selectedVideo.url,
          type: "video/mp4"
        }]
      }, function onPlayerReady() {
        // Boyut Uyumsuzluğu Çözümü: Video yüklendiğinde gerçek oranını al
        this.on('loadedmetadata', () => {
          const video = videoRef.current;
          if (video) {
            console.log(`Video Boyutu: ${video.videoWidth}x${video.videoHeight}`);
          }
        });
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [selectedVideo]);

  // 3. ADIM: Kare Kare Kontrol Mekanizması
  const stepFrame = (direction) => {
    if (!playerRef.current) return;
    const frameTime = 1 / 30; // Yaklaşık kare süresi
    const currentTime = playerRef.current.currentTime();

    playerRef.current.currentTime(
        direction === 'forward'
            ? currentTime + frameTime
            : Math.max(0, currentTime - frameTime)
    );
  };

  // Klavye Kısayolları (Ok tuşları)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") stepFrame('forward');
      if (e.key === "ArrowLeft") stepFrame('backward');
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // Bağımlılık boş kalsa da playerRef üzerinden çalışır

  // 4. ADIM: Kare Yakalama (Capture)
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    alert("Kare başarıyla yakalandı! (Konsola bakınız)");
    console.log("Captured Data URL:", canvas.toDataURL("image/png"));
  };

  return (
      <div className="page-stack selection-page">
        <style>{videoStyles}</style>
        <section className="panel">
          <p className="panel-kicker">Patient ID: {patientId}</p>
          <h2>Ultrasound Analysis Workspace</h2>

          <div className="video-list" style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
            {videos.map((v, index) => (
                <button
                    key={index}
                    className={`secondary-button ${selectedVideo?.url === v.url ? 'active' : ''}`}
                    style={{ border: selectedVideo?.url === v.url ? '2px solid #007bff' : 'none' }}
                    onClick={() => setSelectedVideo(v)}
                >
                  Region: {v.region || index + 1}
                </button>
            ))}
          </div>
        </section>
        {selectedVideo && (
            <section className="panel video-panel">
              {/* Video.js Container (CSS ile kontrol edilmeli) */}
              <div data-vjs-player style={{ backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    className="video-js vjs-big-play-centered"
                    playsInline
                    style={{ objectFit: 'contain' }} // Boyut bozulmasını önler
                />
              </div>

              <div className="controls-row" style={{ marginTop: "20px", display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="secondary-button" onClick={() => stepFrame('backward')}>◀ Previous Frame</button>
                <button className="primary-button" onClick={captureFrame}>📸 Capture Current Frame</button>
                <button className="secondary-button" onClick={() => stepFrame('forward')}>Next Frame ▶</button>
              </div>

              <p style={{ textAlign: "center", color: "#666", fontSize: "12px", marginTop: "10px" }}>
                * Klavye sağ/sol ok tuşlarını kullanarak kare kare gezinebilirsiniz.
              </p>
            </section>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

  );
}