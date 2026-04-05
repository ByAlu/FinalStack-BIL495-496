import { useEffect, useMemo, useRef, useState } from "react";
import { RegionVideosSidebar } from "../components/RegionVideosSidebar";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ViewerHeader } from "../components/ViewerHeader";
import { useFramePlayback } from "../hooks/useFramePlayback";
import { useViewerHold } from "../hooks/useViewerHold";
import { useVideoFrameExtraction } from "../hooks/useVideoFrameExtraction";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { getExaminationByIds } from "../services/mockApi";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];

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
  const activeScrubberPointerIdRef = useRef(null);
  const isDraggingScrubberRef = useRef(false);
  const pendingFrameJumpRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const [activeRegion, setActiveRegion] = useState(initialSelectionState?.activeRegion || initialRegion);
  const [selectedFrames, setSelectedFrames] = useState(initialSelectionState?.selectedFrames || {});
  const [viewerMode, setViewerMode] = useState("video");
  const [selectedFrameRegion, setSelectedFrameRegion] = useState("");
  const [showFpsPopover, setShowFpsPopover] = useState(false);
  const [disabledActionMessage, setDisabledActionMessage] = useState("");
  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const { videoFramesByName, videoInfoByName, extractionStateByName } = useVideoFrameExtraction({
    examination,
    activeRegion,
    examinationCacheKey
  });

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
    fps,
    setFps,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    stopPlayback,
    adjustFps
  } = useFramePlayback({
    viewerMode,
    activeVideoFramesLength: activeVideoFrames.length,
    totalFrames
  });
  const {
    isHoldMode,
    panOffset,
    isHoldGestureActive,
    toggleHoldMode,
    resetHold,
    handleHoldPointerDown,
    handleHoldPointerMove,
    stopHold
  } = useViewerHold({
    viewerStageRef,
    resetDependencies: [activeRegion, viewerMode]
  });
  const {
    isZoomMode,
    zoomScale,
    zoomOrigin,
    isZoomGestureActive,
    toggleZoomMode,
    resetZoom,
    handleZoomPointerDown,
    handleZoomPointerMove,
    stopZoom
  } = useViewerZoom({
    viewerStageRef,
    previewImageRef,
    resetDependencies: [activeRegion, viewerMode]
  });

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
    stopPlayback();
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
    setViewerMode("video");
    setSelectedFrameRegion("");
  }

  function showDisabledActionMessage(message) {
    setDisabledActionMessage(message);
  }

  function clearDisabledActionMessage() {
    setDisabledActionMessage("");
  }

  function handleToggleHoldMode() {
    if (!isHoldMode && isZoomMode) {
      toggleZoomMode();
    }

    toggleHoldMode();
  }

  function handleToggleZoomMode() {
    if (!isZoomMode && isHoldMode) {
      toggleHoldMode();
    }

    toggleZoomMode();
  }

  function resetView() {
    resetHold();
    resetZoom();
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
    stopPlayback();

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
    stopPlayback();
    setCurrentFrame(boundedFrame);
  }

  function handleViewerWheel(event) {
    if (isHoldMode || !activeVideo || activeVideoFrames.length <= 1) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    seekToFrame(currentFrame + direction);
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
    if (isHoldMode) {
      return;
    }

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
  const activeRegionSelection = selectedFrames[activeRegion];
  const isCurrentFrameAlreadySelected = Boolean(
    activeRegionSelection &&
    activeVideo &&
    activeRegionSelection.videoName === activeVideo.name &&
    activeRegionSelection.frameIndex === currentFrame
  );
  const isViewChanged = zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0;

  function handleViewerPointerDown(event) {
    if (isHoldMode) {
      handleHoldPointerDown(event);
      return;
    }

    if (isZoomMode) {
      handleZoomPointerDown(event);
    }
  }

  function handleViewerPointerMove(event) {
    if (isHoldMode) {
      handleHoldPointerMove(event);
      return;
    }

    if (isZoomMode) {
      handleZoomPointerMove(event);
    }
  }

  function stopViewerInteraction(event) {
    stopHold(event);
    stopZoom(event);
  }

  return (
    <div className="page-stack selection-page">
      <section
        className={`selection-layout${showVideoMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}
      >
        <RegionVideosSidebar
          activeRegion={activeRegion}
          examinationId={examination.id}
          examinationVideos={examination.videos}
          onClose={() => setShowVideoMenu(false)}
          onOpen={() => setShowVideoMenu(true)}
          onSelectRegion={handleSelectRegion}
          regions={regions}
          selectedFrames={selectedFrames}
          showVideoMenu={showVideoMenu}
        />

        <section className="selection-main panel">
          <ViewerHeader
            activeSelectedFrame={activeSelectedFrame}
            activeVideo={activeVideo}
            activeVideoFrames={activeVideoFrames}
            adjustFps={adjustFps}
            clearDisabledActionMessage={clearDisabledActionMessage}
            currentFrame={currentFrame}
            fps={fps}
            fpsPopoverRef={fpsPopoverRef}
            handleApprove={handleApprove}
            handleSelectFrame={handleSelectFrame}
            handleToggleHoldMode={handleToggleHoldMode}
            handleTogglePlay={handleTogglePlay}
            handleToggleZoomMode={handleToggleZoomMode}
            isActiveVideoReady={isActiveVideoReady}
            isApprovedReady={isApprovedReady}
            isCurrentFrameAlreadySelected={isCurrentFrameAlreadySelected}
            isHoldMode={isHoldMode}
            isPlaying={isPlaying}
            isViewChanged={isViewChanged}
            isZoomMode={isZoomMode}
            resetView={resetView}
            setFps={setFps}
            setShowFpsPopover={setShowFpsPopover}
            showDisabledActionMessage={showDisabledActionMessage}
            showFpsPopover={showFpsPopover}
            viewerMode={viewerMode}
          />
          <div className="viewer-shell">
            <div
              className={`viewer-stage${isHoldMode ? " hold-ready" : ""}${isHoldGestureActive ? " hold-active" : ""}${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}`}
              onLostPointerCapture={stopViewerInteraction}
              onPointerCancel={stopViewerInteraction}
              onPointerDown={handleViewerPointerDown}
              onPointerMove={handleViewerPointerMove}
              onPointerUp={stopViewerInteraction}
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
                    transform: `translate(calc(-50% + ${panOffset.x}px), ${panOffset.y}px) scale(${zoomScale})`,
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
                        transform: `translate(calc(-50% + ${panOffset.x}px), ${panOffset.y}px) scale(${zoomScale})`,
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
                  <div className="viewer-stage-status">
                    {showCacheProgress ? (
                      <span className="viewer-cache-status">Caching {activeProgressPercent}%</span>
                    ) : null}
                    <span className="viewer-frame-status">
                      Frame {isActiveVideoReady ? Math.min(currentFrame + 1, Math.max(activeVideoFrames.length, 1)) : 0} / {Math.max(activeVideoFrames.length, 0)}
                    </span>
                  </div>
                  {disabledActionMessage ? <div className="viewer-disabled-action-message">{disabledActionMessage}</div> : null}
                </>
              ) : (
                <div className="viewer-placeholder">No video selected</div>
              )}
            </div>
          </div>
        </section>

        <SelectedFramesSidebar
          onClose={() => setShowSelectedMenu(false)}
          onOpen={() => setShowSelectedMenu(true)}
          onSelectFrame={handleSelectedFrameClick}
          regions={regions}
          selectedCount={selectedCount}
          selectedFrameRegion={selectedFrameRegion}
          selectedFrames={selectedFrames}
          showSelectedMenu={showSelectedMenu}
          viewerMode={viewerMode}
        />
      </section>
    </div>
  );
}

