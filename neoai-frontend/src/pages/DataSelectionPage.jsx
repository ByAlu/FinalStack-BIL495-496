import { useEffect, useMemo, useRef, useState } from "react";
import { RegionVideosSidebar } from "../components/RegionVideosSidebar";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ViewerHeader } from "../components/ViewerHeader";
import { ViewerStage } from "../components/ViewerStage";
import { useFramePlayback } from "../hooks/useFramePlayback";
import { useFrameScrubber } from "../hooks/useFrameScrubber";
import { useSelectionSession } from "../hooks/useSelectionSession";
import { useViewerHold } from "../hooks/useViewerHold";
import { useVideoFrameExtraction } from "../hooks/useVideoFrameExtraction";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { getExaminationByIds } from "../services/mockApi";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];

function getExaminationCacheKey(patientId, examinationId) {
  return `neoai-cache:${patientId}:${examinationId}`;
}

export function DataSelectionPage() {
  const { patientId, examinationId } = useParams();
  const navigate = useNavigate();
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const initialRegion = examination?.videos[0]?.region || "r1";
  const examinationCacheKey = getExaminationCacheKey(patientId, examinationId);
  const fpsPopoverRef = useRef(null);
  const pendingFrameJumpRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const [viewerMode, setViewerMode] = useState("video");
  const [selectedFrameRegion, setSelectedFrameRegion] = useState("");
  const [showFpsPopover, setShowFpsPopover] = useState(false);
  const [disabledActionMessage, setDisabledActionMessage] = useState("");
  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const { activeRegion, setActiveRegion, lastViewedFrames, setLastViewedFrames, selectedFrames, setSelectedFrames } = useSelectionSession({
    patientId,
    examinationId,
    initialRegion
  });
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
  const availableFrameCount = Math.max(activeVideoFrames.length, 1);
  const totalFrames = activeExtractionState.status === "done" ? Math.max(activeVideoFrames.length, 1) : availableFrameCount;
  const {
    fps,
    setFps,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    stopPlayback,
    togglePlayback,
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
    setViewerMode("video");
    stopPlayback();
    setCurrentFrame(() => {
      if (pendingFrameJumpRef.current?.region === activeRegion) {
        return pendingFrameJumpRef.current.frameIndex || 0;
      }

      return 0;
    });
  }, [activeRegion, setCurrentFrame, stopPlayback]);

  useEffect(() => {
    setCurrentFrame((current) => Math.min(current, Math.max(activeVideoFrames.length - 1, 0)));
  }, [activeVideoFrames.length]);

  useEffect(() => {
    setLastViewedFrames((current) => {
      if (current[activeRegion] === currentFrame) {
        return current;
      }

      return {
        ...current,
        [activeRegion]: currentFrame
      };
    });
  }, [activeRegion, currentFrame, setLastViewedFrames]);

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
    const nextFrame = lastViewedFrames[region] || 0;

    if (activeRegion === region) {
      setViewerMode("video");
      setSelectedFrameRegion("");
      stopPlayback();
      setCurrentFrame(nextFrame);
      return;
    }

    pendingFrameJumpRef.current = {
      region,
      frameIndex: nextFrame
    };
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

    togglePlayback();
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

  const {
    scrubberRailRef,
    handleRailMouseDown,
    handleRailPointerMove,
    stopRailDrag,
    getScrubberThumbTop
  } = useFrameScrubber({
    activeVideoFramesLength: activeVideoFrames.length,
    isHoldMode,
    onSeekFrame: seekToFrame
  });

  function handleViewerWheel(event) {
    if (isHoldMode || !activeVideo || activeVideoFrames.length <= 1) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    seekToFrame(currentFrame + direction);
  }

  const selectedCount = Object.keys(selectedFrames).length;
  const isApprovedReady = regions.every((region) => selectedFrames[region]);
  const scrubberThumbTop = getScrubberThumbTop(currentFrame);
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
          <ViewerStage
            activeProgressPercent={activeProgressPercent}
            activeRegion={activeRegion}
            activeSelectedFrame={activeSelectedFrame}
            activeVideo={activeVideo}
            activeVideoFrames={activeVideoFrames}
            className={`viewer-stage${isHoldMode ? " hold-ready" : ""}${isHoldGestureActive ? " hold-active" : ""}${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}`}
            currentFrame={currentFrame}
            disabledActionMessage={disabledActionMessage}
            handleRailMouseDown={handleRailMouseDown}
            handleRailPointerMove={handleRailPointerMove}
            handleViewerPointerDown={handleViewerPointerDown}
            handleViewerPointerMove={handleViewerPointerMove}
            handleViewerWheel={handleViewerWheel}
            isActiveVideoReady={isActiveVideoReady}
            onStopViewerInteraction={stopViewerInteraction}
            panOffset={panOffset}
            previewImageRef={previewImageRef}
            scrubberRailRef={scrubberRailRef}
            scrubberThumbTop={scrubberThumbTop}
            selectedFrameRegion={selectedFrameRegion}
            showCacheProgress={showCacheProgress}
            stopRailDrag={stopRailDrag}
            viewerMode={viewerMode}
            viewerStageRef={viewerStageRef}
            zoomOrigin={zoomOrigin}
            zoomScale={zoomScale}
          />
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

