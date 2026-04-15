import { useEffect, useState } from "react";

function createThumbnailFromVideoUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    if (!videoUrl) {
      reject(new Error("Video URL is missing"));
      return;
    }

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.src = videoUrl;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Video could not be loaded"));
    };

    const captureFrame = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (!width || !height) {
        handleError();
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        handleError();
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      try {
        const thumbnail = canvas.toDataURL("image/jpeg", 0.75);
        cleanup();
        resolve(thumbnail);
      } catch {
        handleError();
      }
    };

    video.addEventListener("error", handleError, { once: true });
    video.addEventListener(
      "loadeddata",
      () => {
        const seekTo = Math.min(Math.max(video.duration * 0.05, 0), 0.5);

        if (Number.isFinite(video.duration) && video.duration > 0) {
          video.currentTime = seekTo;
          video.addEventListener("seeked", captureFrame, { once: true });
          return;
        }

        captureFrame();
      },
      { once: true }
    );
  });
}

export function RegionVideosSidebar({
  examinationId,
  examinationVideos,
  regions,
  activeRegion,
  selectedFrames,
  showVideoMenu,
  onClose,
  onOpen,
  onSelectRegion
}) {
  const [thumbnailByRegion, setThumbnailByRegion] = useState({});

  useEffect(() => {
    let isCancelled = false;

    async function generateThumbnails() {
      const nextThumbnails = {};

      await Promise.all(
        examinationVideos.map(async (video) => {
          try {
            const generatedThumbnail = await createThumbnailFromVideoUrl(video.videoUrl);
            nextThumbnails[video.region] = generatedThumbnail;
          } catch {
            nextThumbnails[video.region] = video.thumbnail || "";
          }
        })
      );

      if (!isCancelled) {
        setThumbnailByRegion(nextThumbnails);
      }
    }

    generateThumbnails();

    return () => {
      isCancelled = true;
    };
  }, [examinationVideos]);

  return (
    <aside className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
      {showVideoMenu ? (
        <>
          <div className="region-videos-sidebar-header">
            <div className="region-videos-sidebar-copy">
              <span className="selection-toolbar-kicker">Region Videos</span>
              <strong>{examinationId}</strong>
            </div>
            <button className="panel-arrow-toggle" type="button" onClick={onClose}>
              ‹
            </button>
          </div>

          <div className="region-video-list">
            {regions.map((region) => {
              const regionVideo = examinationVideos.find((video) => video.region === region);
              const isActive = activeRegion === region;
              const isSelected = Boolean(selectedFrames[region]);

              return (
                <button
                  key={region}
                  className={`region-video-item${isActive ? " active" : ""}${isSelected ? " completed" : ""}`}
                  type="button"
                  onClick={() => onSelectRegion(region)}
                >
                  <img
                    alt={`${regionVideo?.name || region} thumbnail`}
                    className="region-video-thumbnail"
                    src={thumbnailByRegion[region] || regionVideo?.thumbnail}
                  />
                  <div className="region-video-meta">
                    <strong>{region.toUpperCase()}</strong>
                    <p>{regionVideo?.name || "No video"}</p>
                    <span className={`selection-status${isSelected ? " done" : ""}`}>
                      {isSelected ? "Frame selected" : "Select frame"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}
    </aside>
  );
}
