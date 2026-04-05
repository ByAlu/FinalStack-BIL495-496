import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import { SelectionToolbar } from "../components/SelectionToolbar";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { getExaminationByIds } from "../services/mockApi";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const SOURCE_FPS = 30;
const examinationCacheStore = new Map();

function getStorageKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}

function getExaminationCacheKey(patientId, examinationId) {
  return `neoai-cache:${patientId}:${examinationId}`;
}

export function DataSelectionPage() {
  const { patientId, examinationId } = useParams();
  const navigate = useNavigate();
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const initialRegion = examination?.videos[0]?.region || "r1";
  const examinationCacheKey = getExaminationCacheKey(patientId, examinationId);
  const initialCache = examinationCacheStore.get(examinationCacheKey);
  const initialSelectionState = (() => {
    if (!patientId || !examinationId) {
      return null;
    }

    const rawValue = window.sessionStorage.getItem(getStorageKey(patientId, examinationId));

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      window.sessionStorage.removeItem(getStorageKey(patientId, examinationId));
      return null;
    }
  })();
  const scrubberRailRef = useRef(null);
  const fpsPopoverRef = useRef(null);
  const playbackTimerRef = useRef(0);
  const extractionRunRef = useRef(0);
  const activeExtractionNameRef = useRef("");
  const activeScrubberPointerIdRef = useRef(null);
  const isDraggingScrubberRef = useRef(false);
  const pendingFrameJumpRef = useRef(null);
  const videoFramesByNameRef = useRef({});
  const videoInfoByNameRef = useRef({});
  const extractionStateByNameRef = useRef({});
  const [activeRegion, setActiveRegion] = useState(initialSelectionState?.activeRegion || initialRegion);
  const [selectedFrames, setSelectedFrames] = useState(initialSelectionState?.selectedFrames || {});
  const [viewerMode, setViewerMode] = useState("video");
  const [selectedFrameRegion, setSelectedFrameRegion] = useState("");
  const [fps, setFps] = useState(10);
  const [showFpsPopover, setShowFpsPopover] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFramesByName, setVideoFramesByName] = useState(initialCache?.videoFramesByName || {});
  const [videoInfoByName, setVideoInfoByName] = useState(initialCache?.videoInfoByName || {});
  const [extractionStateByName, setExtractionStateByName] = useState(initialCache?.extractionStateByName || {});
  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);

  const activeVideo = useMemo(() => {
    return examination?.videos.find((video) => video.region === activeRegion) || null;
  }, [activeRegion, examination]);
  const activeSelectedFrame = selectedFrameRegion ? selectedFrames[selectedFrameRegion] : null;
  const activeVideoFrames = activeVideo ? videoFramesByName[activeVideo.name] || [] : [];
  const activeVideoInfo = activeVideo ? videoInfoByName[activeVideo.name] || null : null;
  const activeExtractionState = activeVideo
    ? extractionStateByName[activeVideo.name] || { status: "idle", progress: 0 }
    : { status: "idle", progress: 0 };
  const activeProgressPercent = Math.round(activeExtractionState.progress * 100);
  const showCacheProgress = Boolean(activeVideo) && activeExtractionState.status !== "done";
  const isActiveVideoReady = Boolean(activeVideo) && activeVideoFrames.length > 0;
  const estimatedFrameCount = Math.max(1, activeVideoInfo?.totalFrames || 1);
  const availableFrameCount = Math.max(activeVideoFrames.length, 1);
  const totalFrames = activeExtractionState.status === "done" ? Math.max(activeVideoFrames.length, 1) : availableFrameCount;
  const {
    viewerStageRef,
    previewImageRef,
    isZoomMode,
    zoomScale,
    zoomOrigin,
    isZoomGestureActive,
    toggleZoomMode,
    resetZoom,
    handleViewerPointerDown,
    handleViewerPointerMove,
    stopViewerZoom
  } = useViewerZoom([activeRegion, viewerMode]);

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
    if (!patientId || !examinationId) {
      return;
    }

    window.sessionStorage.setItem(
      getStorageKey(patientId, examinationId),
      JSON.stringify({
        activeRegion,
        selectedFrames
      })
    );
  }, [activeRegion, selectedFrames, patientId, examinationId]);

  useEffect(() => {
    setViewerMode("video");
    setIsPlaying(false);
    setCurrentFrame(() => {
      if (pendingFrameJumpRef.current?.region === activeRegion) {
        return pendingFrameJumpRef.current.frameIndex || 0;
      }

      return 0;
    });
  }, [activeRegion]);

  useEffect(() => {
    setCurrentFrame((current) => Math.min(current, Math.max(activeVideoFrames.length - 1, 0)));
  }, [activeVideoFrames.length]);

  useEffect(() => {
    if (!pendingFrameJumpRef.current || pendingFrameJumpRef.current.region !== activeRegion) {
      return;
    }

    if (activeVideoFrames.length === 0) {
      return;
    }

    setCurrentFrame(Math.min(pendingFrameJumpRef.current.frameIndex || 0, Math.max(activeVideoFrames.length - 1, 0)));
    pendingFrameJumpRef.current = null;
  }, [activeRegion, activeVideoFrames.length]);

  useEffect(() => {
    window.clearInterval(playbackTimerRef.current);

    if (viewerMode !== "video" || !isPlaying || activeVideoFrames.length === 0) {
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
  }, [activeVideoFrames.length, fps, isPlaying, totalFrames, viewerMode]);

  useEffect(() => {
    return () => {
      window.clearInterval(playbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!fpsPopoverRef.current?.contains(event.target)) {
        setShowFpsPopover(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

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

  if (!examination) {
    return (
      <div className="page-stack">
        <WorkflowSteps currentStep="selection" context={{ patientId, examinationId }} />
        <section className="panel">
          <h2>Examination not found</h2>
          <Link className="secondary-button" to="/query">
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  function handleSelectRegion(region) {
    setActiveRegion(region);
    setSelectedFrameRegion("");
  }

  function handleSelectFrame() {
    if (!isActiveVideoReady || !activeVideoFrames[currentFrame]) {
      return;
    }

    setSelectedFrames((current) => ({
      ...current,
      [activeRegion]: {
        region: activeRegion,
        videoName: activeVideo.name,
        thumbnail: activeVideoFrames[currentFrame],
        frameIndex: currentFrame
      }
    }));
    setViewerMode("frame");
    setSelectedFrameRegion(activeRegion);
  }

  function handleApprove() {
    setActiveWorkflowContext({ patientId, examinationId });
    resetWorkflowAfterStep(patientId, examinationId, 2);
    navigate(`/preprocessing/${patientId}/${examinationId}`, {
      state: {
        patientId,
        examinationId,
        selectedFrames
      }
    });
  }

  function handleTogglePlay() {
    setViewerMode("video");
    setSelectedFrameRegion("");

    if (currentFrame >= Math.max(activeVideoFrames.length - 1, 0)) {
      setCurrentFrame(0);
    }

    setIsPlaying((current) => !current);
  }

  function handleSelectedFrameClick(region) {
    const selectedFrame = selectedFrames[region];

    if (!selectedFrame) {
      return;
    }

    pendingFrameJumpRef.current = {
      region,
      frameIndex: selectedFrame.frameIndex || 0
    };
    setViewerMode("video");
    setSelectedFrameRegion(region);
    setIsPlaying(false);

    if (activeRegion === region) {
      setCurrentFrame(selectedFrame.frameIndex || 0);
      pendingFrameJumpRef.current = null;
      return;
    }

    setActiveRegion(region);
  }

  function seekToFrame(nextFrame) {
    const maxFrame = Math.max(activeVideoFrames.length - 1, 0);
    const boundedFrame = Math.max(0, Math.min(maxFrame, nextFrame));

    setViewerMode("video");
    setSelectedFrameRegion("");
    setIsPlaying(false);
    setCurrentFrame(boundedFrame);
  }

  function handleViewerWheel(event) {
    if (!activeVideo || activeVideoFrames.length <= 1) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    seekToFrame(currentFrame + direction);
  }

  function adjustFps(delta) {
    setFps((current) => Math.max(1, Math.min(60, current + delta)));
  }

  function updateFrameFromRail(clientY) {
    if (!scrubberRailRef.current) {
      return;
    }

    const rect = scrubberRailRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const ratio = rect.height <= 0 ? 0 : relativeY / rect.height;
    seekToFrame(Math.round(ratio * Math.max(activeVideoFrames.length - 1, 0)));
  }

  function handleRailMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    isDraggingScrubberRef.current = true;
    activeScrubberPointerIdRef.current = event.pointerId;
    scrubberRailRef.current?.setPointerCapture(event.pointerId);
    updateFrameFromRail(event.clientY);
  }

  function handleRailPointerMove(event) {
    if (!isDraggingScrubberRef.current || activeScrubberPointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    updateFrameFromRail(event.clientY);
  }

  function stopRailDrag(event) {
    if (activeScrubberPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (scrubberRailRef.current?.hasPointerCapture(event.pointerId)) {
      scrubberRailRef.current.releasePointerCapture(event.pointerId);
    }

    isDraggingScrubberRef.current = false;
    activeScrubberPointerIdRef.current = null;
  }

  const selectedCount = Object.keys(selectedFrames).length;
  const isApprovedReady = regions.every((region) => selectedFrames[region]);
  const scrubberThumbTop = activeVideoFrames.length <= 1 ? 0 : (currentFrame / (activeVideoFrames.length - 1)) * 100;

  return (
    <div className="page-stack selection-page">
      <WorkflowSteps currentStep="selection" context={{ patientId, examinationId }} />

      <section
        className={`selection-layout${showVideoMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}
      >
        <aside className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
          {showVideoMenu ? (
            <>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Region videos</p>
                  <h3>{examination.id}</h3>
                </div>
                <button className="panel-arrow-toggle" type="button" onClick={() => setShowVideoMenu(false)}>
                  ←
                </button>
              </div>

              <div className="region-video-list">
                {regions.map((region) => {
                  const regionVideo = examination.videos.find((video) => video.region === region);
                  const isActive = activeRegion === region;
                  const isSelected = Boolean(selectedFrames[region]);

                  return (
                    <button
                      key={region}
                      className={`region-video-item${isActive ? " active" : ""}${isSelected ? " completed" : ""}`}
                      type="button"
                      onClick={() => handleSelectRegion(region)}
                    >
                      <img
                        alt={`${regionVideo?.name || region} thumbnail`}
                        className="region-video-thumbnail"
                        src={regionVideo?.thumbnail}
                      />
                      <div>
                        <strong>{region.toUpperCase()}</strong>
                        <p>{regionVideo?.name || "No video"}</p>
                      </div>
                      <span className={`selection-status${isSelected ? " done" : ""}`}>
                        {isSelected ? "Frame selected" : "Select frame"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <button className="panel-edge-toggle" type="button" onClick={() => setShowVideoMenu(true)}>
              →
            </button>
          )}
        </aside>

        <section className="selection-main panel">
          <div className="selection-viewer-header">
            <div className="viewer-header-actions">
              <div className="viewer-header-side viewer-header-side-left">
                <SelectionToolbar ariaLabel="Viewer tools">
                  <button
                    aria-label={isZoomMode ? "Disable zoom mode" : "Enable zoom mode"}
                    className={`selection-toolbar-icon-button${isZoomMode ? " active" : ""}`}
                    type="button"
                    onClick={toggleZoomMode}
                    disabled={!activeVideo && !(viewerMode === "frame" && activeSelectedFrame)}
                    title={isZoomMode ? "Disable zoom mode" : "Enable zoom mode"}
                  >
                    <ZoomInRoundedIcon fontSize="small" />
                  </button>
                  <button
                    aria-label="Reset view"
                    className="selection-toolbar-icon-button"
                    type="button"
                    onClick={resetZoom}
                    disabled={zoomScale === 1}
                    title="Reset view"
                  >
                    <RestartAltRoundedIcon fontSize="small" />
                  </button>
                </SelectionToolbar>
              </div>
              <div className="viewer-header-center">
                <div className="viewer-control-cluster">
                  <button className="viewer-play-button" type="button" onClick={handleTogglePlay}>
                    {isPlaying ? "||" : "▶"}
                  </button>
                  <div className="viewer-fps-control" ref={fpsPopoverRef}>
                    <label className="viewer-fps-chip">
                      <button className="viewer-fps-step" type="button" onClick={() => adjustFps(-1)}>
                        ‹
                      </button>
                      <button
                        className="viewer-fps-trigger"
                        type="button"
                        onClick={() => setShowFpsPopover((current) => !current)}
                      >
                        <input
                          type="number"
                          min="1"
                          max="60"
                          step="1"
                          value={fps}
                          onChange={(event) => setFps(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowFpsPopover(true);
                          }}
                        />
                        <span>FPS</span>
                      </button>
                      <button className="viewer-fps-step" type="button" onClick={() => adjustFps(1)}>
                        ›
                      </button>
                    </label>
                    {showFpsPopover ? (
                      <div className="viewer-fps-popover">
                        <input
                          aria-label="FPS slider"
                          className="viewer-fps-slider"
                          max="60"
                          min="1"
                          step="1"
                          type="range"
                          value={fps}
                          onChange={(event) => setFps(Number(event.target.value))}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="viewer-header-side viewer-header-side-right">
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleSelectFrame}
                  disabled={viewerMode !== "video" || !isActiveVideoReady || !activeVideoFrames[currentFrame]}
                >
                  Select Frame
                </button>
              </div>
            </div>
          </div>

          <div className="viewer-shell">
            <div
              className={`viewer-stage${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}`}
              onLostPointerCapture={stopViewerZoom}
              onPointerCancel={stopViewerZoom}
              onPointerDown={handleViewerPointerDown}
              onPointerMove={handleViewerPointerMove}
              onPointerUp={stopViewerZoom}
              onWheel={handleViewerWheel}
              ref={viewerStageRef}
            >
              {viewerMode === "frame" && activeSelectedFrame ? (
                <img
                  alt={`${selectedFrameRegion} selected frame`}
                  className="selection-frame-preview"
                  ref={previewImageRef}
                  src={activeSelectedFrame.thumbnail}
                  style={{
                    transform: `translateX(-50%) scale(${zoomScale})`,
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                  }}
                />
              ) : activeVideo ? (
                <>
                  {isActiveVideoReady && activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))] ? (
                    <img
                      alt={`${activeRegion} frame ${currentFrame + 1}`}
                      className="selection-frame-preview"
                      ref={previewImageRef}
                      src={activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]}
                      style={{
                        transform: `translateX(-50%) scale(${zoomScale})`,
                        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                      }}
                    />
                  ) : (
                    <div className="viewer-placeholder viewer-loading-state">Preparing frames...</div>
                  )}
                  <div
                    aria-label="Frame scrubber"
                    aria-valuemax={Math.max(0, activeVideoFrames.length - 1)}
                    aria-valuemin="0"
                    aria-valuenow={Math.min(currentFrame, Math.max(0, activeVideoFrames.length - 1))}
                    className="viewer-frame-rail"
                    onPointerCancel={stopRailDrag}
                    onPointerDown={handleRailMouseDown}
                    onPointerMove={handleRailPointerMove}
                    onPointerUp={stopRailDrag}
                    onLostPointerCapture={stopRailDrag}
                    ref={scrubberRailRef}
                    role="slider"
                    tabIndex={0}
                  >
                    <div className="viewer-frame-rail-track" />
                    <div className="viewer-frame-rail-thumb" style={{ top: `${scrubberThumbTop}%` }} />
                  </div>
                </>
              ) : (
                <div className="viewer-placeholder">No video selected</div>
              )}
            </div>

            <div className="viewer-controls">
              {showCacheProgress ? (
                <span className="viewer-cache-status">Caching {activeProgressPercent}%</span>
              ) : null}
              <span className="viewer-frame-status">
                Frame {isActiveVideoReady ? Math.min(currentFrame + 1, Math.max(activeVideoFrames.length, 1)) : 0} / {Math.max(activeVideoFrames.length, 0)}
              </span>
            </div>
          </div>
        </section>

        <aside className={`selected-frames-sidebar panel${showSelectedMenu ? "" : " collapsed"}`}>
          {showSelectedMenu ? (
            <>
              <div className="selected-frames-panel">
                <div className="selected-frames-header">
                  <button className="panel-arrow-toggle" type="button" onClick={() => setShowSelectedMenu(false)}>
                    →
                  </button>
                  <strong>Selected Frames</strong>
                  <span>
                    {selectedCount} / 6 regions completed
                  </span>
                </div>

                <div className="selected-frames-column">
                  {regions.map((region) => {
                    const frame = selectedFrames[region];

                    return (
                      <button
                        className={`selected-frame-card${selectedFrameRegion === region && viewerMode === "frame" ? " active" : ""}`}
                        key={region}
                        type="button"
                        onClick={() => handleSelectedFrameClick(region)}
                      >
                        {frame ? (
                          <img alt={`${region} selected frame`} className="selected-frame-image" src={frame.thumbnail} />
                        ) : (
                          <div className="selected-frame-placeholder">{region.toUpperCase()}</div>
                        )}
                        <div className="selected-frame-meta">
                          <strong>{region.toUpperCase()}</strong>
                          <span>{frame ? frame.videoName : "No frame selected"}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="selection-approve-row">
                <button className="primary-button" disabled={!isApprovedReady} type="button" onClick={handleApprove}>
                  Approve
                </button>
              </div>
            </>
          ) : (
            <button className="panel-edge-toggle" type="button" onClick={() => setShowSelectedMenu(true)}>
              ←
            </button>
          )}
        </aside>
      </section>
    </div>
  );
}
