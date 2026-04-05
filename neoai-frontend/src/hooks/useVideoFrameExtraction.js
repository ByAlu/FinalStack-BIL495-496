import { useEffect, useRef, useState } from "react";

const SOURCE_FPS = 30;
const examinationCacheStore = new Map();

export function useVideoFrameExtraction({ examination, activeRegion, examinationCacheKey }) {
  const initialCache = examinationCacheStore.get(examinationCacheKey);
  const extractionRunRef = useRef(0);
  const activeExtractionNameRef = useRef("");
  const videoFramesByNameRef = useRef(initialCache?.videoFramesByName || {});
  const videoInfoByNameRef = useRef(initialCache?.videoInfoByName || {});
  const extractionStateByNameRef = useRef(initialCache?.extractionStateByName || {});
  const [videoFramesByName, setVideoFramesByName] = useState(initialCache?.videoFramesByName || {});
  const [videoInfoByName, setVideoInfoByName] = useState(initialCache?.videoInfoByName || {});
  const [extractionStateByName, setExtractionStateByName] = useState(initialCache?.extractionStateByName || {});

  useEffect(() => {
    videoFramesByNameRef.current = videoFramesByName;
    examinationCacheStore.set(examinationCacheKey, {
      videoFramesByName,
      videoInfoByName: videoInfoByNameRef.current,
      extractionStateByName: extractionStateByNameRef.current
    });
  }, [examinationCacheKey, videoFramesByName]);

  useEffect(() => {
    videoInfoByNameRef.current = videoInfoByName;
    examinationCacheStore.set(examinationCacheKey, {
      videoFramesByName: videoFramesByNameRef.current,
      videoInfoByName,
      extractionStateByName: extractionStateByNameRef.current
    });
  }, [examinationCacheKey, videoInfoByName]);

  useEffect(() => {
    extractionStateByNameRef.current = extractionStateByName;
    examinationCacheStore.set(examinationCacheKey, {
      videoFramesByName: videoFramesByNameRef.current,
      videoInfoByName: videoInfoByNameRef.current,
      extractionStateByName
    });
  }, [examinationCacheKey, extractionStateByName]);

  useEffect(() => {
    if (!examination?.videos?.length) {
      return undefined;
    }

    let cancelled = false;
    extractionRunRef.current += 1;
    const queueRunId = extractionRunRef.current;

    async function extractVideo(video) {
      const videoName = video.name;
      const existingFrames = videoFramesByNameRef.current[videoName] || [];
      const videoElement = document.createElement("video");
      videoElement.muted = true;
      videoElement.volume = 0;
      videoElement.playsInline = true;
      videoElement.preload = "auto";

      await new Promise((resolve, reject) => {
        const handleLoadedMetadata = () => {
          videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
          videoElement.removeEventListener("error", handleError);
          resolve();
        };

        const handleError = () => {
          videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
          videoElement.removeEventListener("error", handleError);
          reject(new Error(`Failed to load ${videoName}`));
        };

        videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
        videoElement.addEventListener("error", handleError);
        videoElement.src = video.videoUrl;
        videoElement.load();
      });

      const durationValue = videoElement.duration || 0;
      const frameCount = Math.max(1, Math.floor(durationValue * SOURCE_FPS));
      const startIndex = Math.min(existingFrames.length, frameCount);

      setVideoInfoByName((current) => ({
        ...current,
        [videoName]: {
          duration: durationValue,
          totalFrames: frameCount
        }
      }));
      setExtractionStateByName((current) => ({
        ...current,
        [videoName]: {
          status: "extracting",
          progress: startIndex / frameCount
        }
      }));

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;

      const seekVideoTo = async (time) =>
        new Promise((resolve) => {
          const handleSeeked = () => {
            videoElement.removeEventListener("seeked", handleSeeked);
            resolve();
          };

          videoElement.addEventListener("seeked", handleSeeked, { once: true });
          videoElement.currentTime = time;
        });

      const frames = existingFrames.slice();

      for (let frameIndex = startIndex; frameIndex < frameCount; frameIndex += 1) {
        if (cancelled || extractionRunRef.current !== queueRunId) {
          setExtractionStateByName((current) => ({
            ...current,
            [videoName]: {
              status: "paused",
              progress: frames.length / frameCount
            }
          }));
          return;
        }

        const time = Math.min(frameIndex / SOURCE_FPS, Math.max(durationValue - 0.001, 0));
        await seekVideoTo(time);
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.72));

        if (frameIndex % 10 === 0 || frameIndex === frameCount - 1) {
          setVideoFramesByName((current) => ({
            ...current,
            [videoName]: frames.slice()
          }));
          setExtractionStateByName((current) => ({
            ...current,
            [videoName]: {
              status: "extracting",
              progress: (frameIndex + 1) / frameCount
            }
          }));
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }

      setVideoFramesByName((current) => ({
        ...current,
        [videoName]: frames
      }));
      setExtractionStateByName((current) => ({
        ...current,
        [videoName]: {
          status: "done",
          progress: 1
        }
      }));
    }

    async function runQueue() {
      const orderedVideos = [
        ...examination.videos.filter((video) => video.region === activeRegion),
        ...examination.videos.filter((video) => video.region !== activeRegion)
      ];

      for (const video of orderedVideos) {
        if (cancelled) {
          return;
        }

        const state = extractionStateByNameRef.current[video.name];
        if (state?.status === "done") {
          continue;
        }

        activeExtractionNameRef.current = video.name;
        try {
          await extractVideo(video);
        } catch {
          setExtractionStateByName((current) => ({
            ...current,
            [video.name]: {
              status: "error",
              progress: 0
            }
          }));
        }
      }

      activeExtractionNameRef.current = "";
    }

    runQueue();

    return () => {
      cancelled = true;
      activeExtractionNameRef.current = "";
    };
  }, [activeRegion, examination]);

  return {
    videoFramesByName,
    videoInfoByName,
    extractionStateByName
  };
}
