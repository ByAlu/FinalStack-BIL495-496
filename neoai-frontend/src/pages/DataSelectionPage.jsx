import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { getExaminationByIds } from "../services/mockApi";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";
import VideoPlayer from "../components/VideoPlayer";
import PlayControls from "../components/PlayControls";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

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
  const [activeRegion, setActiveRegion] = useState("r1");
  const [selectedFrames, setSelectedFrames] = useState({});
  const [viewerMode, setViewerMode] = useState("video");
  const [selectedFrameRegion, setSelectedFrameRegion] = useState("");
  const [fps, setFps] = useState(10);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFramesByName, setVideoFramesByName] = useState({});
  const [videoInfoByName, setVideoInfoByName] = useState({});
  const [extractionStateByName, setExtractionStateByName] = useState({});
  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const scrubberRailRef = useRef(null);
  const playbackTimerRef = useRef(0);
  const extractionRunRef = useRef(0);
  const activeExtractionNameRef = useRef("");
  const isDraggingScrubberRef = useRef(false);
  const pendingFrameJumpRef = useRef(null);
  const videoFramesByNameRef = useRef({});
  const videoInfoByNameRef = useRef({});
  const extractionStateByNameRef = useRef({});
  const [examination, setExamination] = useState(null);

  // Fetch videos on initial load
  useEffect(() => {
    const fetchExamination = async () => {
      try {
        const videos = await getVideos(patientId, examinationId);
        setExamination(videos);
        const initialRegion = videos?.[0]?.region || "r1";
        setActiveRegion(initialRegion);
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchExamination();
  }, [patientId, examinationId]);

  const activeVideo = useMemo(() => {
    return examination?.videos.find((video) => video.region === activeRegion) || null;
  }, [activeRegion, examination]);

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

  // Store selected frames and other data
  useEffect(() => {
    if (!patientId || !examinationId) return;

    window.sessionStorage.setItem(
      getStorageKey(patientId, examinationId),
      JSON.stringify({
        activeRegion,
        selectedFrames,
      })
    );
  }, [activeRegion, selectedFrames, patientId, examinationId]);

  // Handle frame-by-frame playback
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

  const handleSelectRegion = (region) => {
    setActiveRegion(region);
    setSelectedFrameRegion("");
  };

  const handleSelectFrame = () => {
    if (!isActiveVideoReady || !activeVideoFrames[currentFrame]) return;

    setSelectedFrames((current) => ({
      ...current,
      [activeRegion]: {
        region: activeRegion,
        videoName: activeVideo.name,
        thumbnail: activeVideoFrames[currentFrame],
        frameIndex: currentFrame,
      },
    }));

    setViewerMode("frame");
    setSelectedFrameRegion(activeRegion);
  };

  const handleApprove = async () => {
    // Preprocess selected frames
    try {
      const processedFrames = await preprocess({
        patientId,
        examinationId,
        selectedFrames: Object.values(selectedFrames),
      });
      navigate(`/preprocessing/${patientId}/${examinationId}`, {
        state: { patientId, examinationId, selectedFrames: processedFrames },
      });
    } catch (error) {
      console.error("Error during preprocessing:", error);
    }
  };

  const handleTogglePlay = () => {
    setViewerMode("video");
    setSelectedFrameRegion("");

    if (currentFrame >= Math.max(activeVideoFrames.length - 1, 0)) {
      setCurrentFrame(0);
    }

    setIsPlaying((current) => !current);
  };

  const seekToFrame = (nextFrame) => {
    const maxFrame = Math.max(activeVideoFrames.length - 1, 0);
    const boundedFrame = Math.max(0, Math.min(maxFrame, nextFrame));

    setViewerMode("video");
    setSelectedFrameRegion("");
    setIsPlaying(false);
    setCurrentFrame(boundedFrame);
  };

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
  
  return (
    <div className="page-stack selection-page">
      <WorkflowSteps currentStep="selection" context={{ patientId, examinationId }} />

      <section
        className={`selection-layout${showVideoMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}
      > {/* Left Sidebar */}
        <aside className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
          {showVideoMenu ? (
            <>
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Region videos</p>
                  <h3>{examination.id}</h3>
                </div>
                <button className="panel-arrow-toggle" type="button" onClick={() => setShowVideoMenu(false)}>
                  <ArrowBackIosIcon fontSize="small"/>
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
              <ArrowForwardIosIcon fontSize="small"/>
            </button>
          )}
        </aside>
          {/* Main Panel */}
        <section className="selection-main panel">
          <div className="selection-viewer-header">
            <div className="viewer-header-actions">
              <div className="viewer-header-side viewer-header-side-left" />
              <div className="viewer-header-center">
                <PlayControls
                  isPlaying={isPlaying}
                  handleTogglePlay={handleTogglePlay}
                  fps={fps}
                  setFps={setFps}
                  showFpsPopover={showFpsPopover}
                  setShowFpsPopover={setShowFpsPopover}
                  adjustFps={adjustFps}
                  fpsPopoverRef={fpsPopoverRef}
                />
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
            <div className="viewer-stage" onWheel={handleViewerWheel}>
              {viewerMode === "frame" && activeSelectedFrame ? (
                <img
                  alt={`${selectedFrameRegion} selected frame`}
                  className="selection-frame-preview"
                  src={activeSelectedFrame.thumbnail}
                />
              ) : (
                <VideoPlayer
                  videoURL={examination.videos.find(video => video.region === activeRegion)?.url}
                  isPlaying={isPlaying}
                  currentFrame={currentFrame}
                  activeVideoFrames={activeVideoFrames}
                  isActiveVideoReady={isActiveVideoReady}
                />
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
        {/* Right Sidebar */}
        <aside className={`selected-frames-sidebar panel${showSelectedMenu ? "" : " collapsed"}`}>
          {showSelectedMenu ? (
            <>
              <div className="selected-frames-panel">
                <div className="selected-frames-header">
                  <button className="panel-arrow-toggle" type="button" onClick={() => setShowSelectedMenu(false)}>
                    <ArrowForwardIosIcon fontSize="small"/>
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
              <ArrowBackIosIcon fontSize="small"/>
            </button>
          )}
        </aside>
      </section>
    </div>
  );



}
