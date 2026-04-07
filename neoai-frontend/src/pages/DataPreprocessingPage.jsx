import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { PreprocessingOptionsSidebar } from "../components/PreprocessingOptionsSidebar";
import { ProcessingViewerHeader } from "../components/ProcessingViewerHeader";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { ViewerStage } from "../components/ViewerStage";
import { useSelectionSession } from "../hooks/useSelectionSession";
import { useViewerHold } from "../hooks/useViewerHold";
import { useVideoFrameExtraction } from "../hooks/useVideoFrameExtraction";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { getExaminationByIds } from "../services/mockApi";
import { applyOperationsToFrame } from "../utils/imageProcessing";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const DEFAULT_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const MAX_MAGNIFIER_CONFIG = { size: 500, zoomFactor: 8 };
const MIN_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const PREVIEW_PROCESSING_DEBOUNCE_MS = 180;
const OPENCV_READY_EVENT = "opencv-ready";
const DEFAULT_OPERATIONS = [
  {
    id: "median-filter",
    type: "median-filter",
    label: "Median filter",
    description: "Reduce speckle noise on the selected ultrasound frames.",
    enabled: true,
    kernelSize: 3
  }
];

function getExaminationCacheKey(patientId, examinationId) {
  return `neoai-cache:${patientId}:${examinationId}`;
}

function normalizeRotation(nextRotation) {
  const normalized = nextRotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getMagnifierState(stageRect, imageRect, clientX, clientY, magnifierConfig) {
  const lensSize = magnifierConfig.size;
  const zoomFactor = magnifierConfig.zoomFactor;
  const clampedX = Math.min(Math.max(clientX, imageRect.left), imageRect.right);
  const clampedY = Math.min(Math.max(clientY, imageRect.top), imageRect.bottom);
  const localX = clampedX - imageRect.left;
  const localY = clampedY - imageRect.top;

  return {
    x: clampedX - stageRect.left,
    y: clampedY - stageRect.top,
    backgroundWidth: imageRect.width * zoomFactor,
    backgroundHeight: imageRect.height * zoomFactor,
    backgroundOffsetX: -(localX * zoomFactor) + lensSize / 2,
    backgroundOffsetY: -(localY * zoomFactor) + lensSize / 2
  };
}

export function DataPreprocessingPage() {
  const { patientId, examinationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const initialRegion = examination?.videos[0]?.region || "r1";
  const examinationCacheKey = getExaminationCacheKey(patientId, examinationId);
  const magnifierPopoverRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const [operations, setOperations] = useState(DEFAULT_OPERATIONS);
  const [previewOperations, setPreviewOperations] = useState(DEFAULT_OPERATIONS);
  const [showOptionsMenu, setShowOptionsMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [isMagnifierMode, setIsMagnifierMode] = useState(false);
  const [showMagnifierPopover, setShowMagnifierPopover] = useState(false);
  const [magnifierConfig, setMagnifierConfig] = useState(DEFAULT_MAGNIFIER_CONFIG);
  const [magnifierState, setMagnifierState] = useState({
    x: 0,
    y: 0,
    backgroundWidth: 0,
    backgroundHeight: 0,
    backgroundOffsetX: 0,
    backgroundOffsetY: 0
  });
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [viewRotation, setViewRotation] = useState(0);
  const [processedPreviewSrc, setProcessedPreviewSrc] = useState("");
  const [processedFrames, setProcessedFrames] = useState({});
  const [isApplyPending, setIsApplyPending] = useState(false);
  const [openCvStatus, setOpenCvStatus] = useState("loading");
  const { selectedFrames, setSelectedFrames } = useSelectionSession({
    patientId,
    examinationId,
    initialRegion
  });

  useEffect(() => {
    function handleOpenCvReady() {
      setOpenCvStatus("ready");
    }

    if (window.cv) {
      setOpenCvStatus("ready");
      return undefined;
    }

    const handleReadyEvent = () => handleOpenCvReady();
    const handleScriptError = (event) => {
      const target = event.target;

      if (target instanceof HTMLScriptElement && target.src.includes("opencv.js")) {
        setOpenCvStatus("error");
      }
    };

    window.addEventListener(OPENCV_READY_EVENT, handleReadyEvent);
    window.addEventListener("error", handleScriptError);

    return () => {
      window.removeEventListener(OPENCV_READY_EVENT, handleReadyEvent);
      window.removeEventListener("error", handleScriptError);
    };
  }, []);

  const isOpenCvReady = openCvStatus === "ready";
  const viewerOverlayMessage =
    openCvStatus === "loading"
      ? "Loading OpenCV for preprocessing..."
      : openCvStatus === "error"
        ? "OpenCV failed to load. Please refresh the page."
        : "";

  useEffect(() => {
    if (location.state?.selectedFrames && Object.keys(location.state.selectedFrames).length > 0) {
      setSelectedFrames(location.state.selectedFrames);
    }
  }, [location.state, setSelectedFrames]);

  const selectedFrameMap =
    location.state?.selectedFrames && Object.keys(location.state.selectedFrames).length > 0
      ? location.state.selectedFrames
      : selectedFrames;
  const selectedRegions = useMemo(() => regions.filter((region) => selectedFrameMap[region]), [selectedFrameMap]);
  const [activeRegion, setActiveRegion] = useState(selectedRegions[0] || initialRegion);

  useEffect(() => {
    if (selectedRegions.length > 0 && !selectedFrameMap[activeRegion]) {
      setActiveRegion(selectedRegions[0]);
    }
  }, [activeRegion, selectedFrameMap, selectedRegions]);

  const activeSelectedFrame = activeRegion ? selectedFrameMap[activeRegion] || null : null;
  const { videoFramesByName } = useVideoFrameExtraction({
    examination,
    activeRegion,
    examinationCacheKey
  });

  function getSelectedFrameSource(frame) {
    if (!frame?.videoName || !Number.isInteger(frame.frameIndex)) {
      return frame?.thumbnail || "";
    }

    return videoFramesByName[frame.videoName]?.[frame.frameIndex] || frame.thumbnail || "";
  }

  const extractedActiveFrameSrc =
    activeSelectedFrame?.videoName &&
    Number.isInteger(activeSelectedFrame.frameIndex) &&
    videoFramesByName[activeSelectedFrame.videoName]?.[activeSelectedFrame.frameIndex]
      ? videoFramesByName[activeSelectedFrame.videoName][activeSelectedFrame.frameIndex]
      : "";
  const previewSource = extractedActiveFrameSrc || "";

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
    resetDependencies: [activeRegion]
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
    resetDependencies: [activeRegion]
  });

  useEffect(() => {
    function handlePointerDown(event) {
      if (!magnifierPopoverRef.current?.contains(event.target)) {
        setShowMagnifierPopover(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPreviewOperations(operations);
    }, PREVIEW_PROCESSING_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [operations]);

  useEffect(() => {
    let ignore = false;

    async function buildPreview() {
      if (!previewSource) {
        setProcessedPreviewSrc("");
        return;
      }

      if (!isOpenCvReady) {
        setProcessedPreviewSrc("");
        return;
      }

      try {
        const nextPreview = await applyOperationsToFrame(previewSource, previewOperations);

        if (!ignore) {
          setProcessedPreviewSrc(nextPreview);
        }
      } catch (error) {
        if (!ignore) {
          setProcessedPreviewSrc("");
          setOpenCvStatus("error");
        }
      }
    }

    buildPreview();

    return () => {
      ignore = true;
    };
  }, [isOpenCvReady, previewOperations, previewSource]);

  if (!examination) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>Examination not found</h2>
          <Link className="secondary-button" to="/query">
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  if (selectedRegions.length === 0) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>No selected frames found</h2>
          <p>Choose frames in the selection step before opening preprocessing.</p>
          <Link className="secondary-button" to={`/selection/${patientId}/${examinationId}`}>
            Back to selection
          </Link>
        </section>
      </div>
    );
  }

  function handleToggleHoldMode() {
    if (!isHoldMode && isZoomMode) {
      toggleZoomMode();
    }

    if (!isHoldMode && isMagnifierMode) {
      setIsMagnifierMode(false);
      setIsMagnifierActive(false);
      setShowMagnifierPopover(false);
    }

    toggleHoldMode();
  }

  function handleToggleZoomMode() {
    if (!isZoomMode && isHoldMode) {
      toggleHoldMode();
    }

    if (!isZoomMode && isMagnifierMode) {
      setIsMagnifierMode(false);
      setIsMagnifierActive(false);
      setShowMagnifierPopover(false);
    }

    toggleZoomMode();
  }

  function handleToggleMagnifierMode() {
    if (!isMagnifierMode && isHoldMode) {
      toggleHoldMode();
    }

    if (!isMagnifierMode && isZoomMode) {
      toggleZoomMode();
    }

    setIsMagnifierMode((current) => !current);
    setIsMagnifierActive(false);
    setShowMagnifierPopover(false);
  }

  function handleMagnifierSizeChange(nextSize) {
    setMagnifierConfig((current) => ({
      ...current,
      size: Math.max(MIN_MAGNIFIER_CONFIG.size, Math.min(MAX_MAGNIFIER_CONFIG.size, nextSize))
    }));
  }

  function handleMagnifierZoomChange(nextZoomFactor) {
    setMagnifierConfig((current) => ({
      ...current,
      zoomFactor: Math.max(MIN_MAGNIFIER_CONFIG.zoomFactor, Math.min(MAX_MAGNIFIER_CONFIG.zoomFactor, nextZoomFactor))
    }));
  }

  function handleRotateLeft() {
    setViewRotation((current) => normalizeRotation(current - 90));
  }

  function handleRotateRight() {
    setViewRotation((current) => normalizeRotation(current + 90));
  }

  function resetView() {
    resetHold();
    resetZoom();
    setMagnifierConfig(DEFAULT_MAGNIFIER_CONFIG);
    setViewRotation(0);
  }

  function updateOperation(operationId, updater) {
    setOperations((current) =>
      current.map((operation) => (operation.id === operationId ? { ...operation, ...updater(operation) } : operation))
    );
  }

  function handleToggleOperation(operationId, enabled) {
    updateOperation(operationId, () => ({ enabled }));
  }

  function handleKernelSizeChange(operationId, kernelSize) {
    updateOperation(operationId, () => ({ kernelSize }));
  }

  async function processAllSelectedFrames() {
    const nextEntries = await Promise.all(
      selectedRegions.map(async (region) => {
        const frame = selectedFrameMap[region];
        const sourceFrame = getSelectedFrameSource(frame);
        const thumbnail = await applyOperationsToFrame(sourceFrame, operations);
        return [region, { ...frame, thumbnail }];
      })
    );

    return Object.fromEntries(nextEntries);
  }

  async function handleContinue() {
    if (!isOpenCvReady) {
      return;
    }

    setIsApplyPending(true);

    try {
      const nextProcessedFrames =
        Object.keys(processedFrames).length === selectedRegions.length ? processedFrames : await processAllSelectedFrames();

      setProcessedFrames(nextProcessedFrames);
      setActiveWorkflowContext({ patientId, examinationId });
      resetWorkflowAfterStep(patientId, examinationId, 3);
      navigate(`/ai-module/${patientId}/${examinationId}`, {
        state: {
          patientId,
          examinationId,
          selectedFrames: selectedFrameMap,
          processedFrames: nextProcessedFrames,
          preprocessingOperations: operations
        }
      });
    } finally {
      setIsApplyPending(false);
    }
  }

  function handleViewerPointerDown(event) {
    if (isMagnifierMode) {
      const stageElement = viewerStageRef.current;
      const imageElement = previewImageRef.current;

      if (!stageElement || !imageElement) {
        return;
      }

      const stageRect = stageElement.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      const insideImage =
        event.clientX >= imageRect.left &&
        event.clientX <= imageRect.right &&
        event.clientY >= imageRect.top &&
        event.clientY <= imageRect.bottom;

      if (!insideImage) {
        setIsMagnifierActive(false);
        return;
      }

      setMagnifierState(getMagnifierState(stageRect, imageRect, event.clientX, event.clientY, magnifierConfig));
      setIsMagnifierActive(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (isHoldMode) {
      handleHoldPointerDown(event);
      return;
    }

    if (isZoomMode) {
      handleZoomPointerDown(event);
    }
  }

  function handleViewerPointerMove(event) {
    if (isMagnifierMode) {
      if ((event.buttons & 1) !== 1) {
        return;
      }

      const stageElement = viewerStageRef.current;
      const imageElement = previewImageRef.current;

      if (!stageElement || !imageElement) {
        return;
      }

      const stageRect = stageElement.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      setMagnifierState(getMagnifierState(stageRect, imageRect, event.clientX, event.clientY, magnifierConfig));
      setIsMagnifierActive(true);
      return;
    }

    if (isHoldMode) {
      handleHoldPointerMove(event);
      return;
    }

    if (isZoomMode) {
      handleZoomPointerMove(event);
    }
  }

  function stopViewerInteraction(event) {
    if (isMagnifierActive) {
      setIsMagnifierActive(false);
    }

    stopHold(event);
    stopZoom(event);
  }

  const previewFrame = activeSelectedFrame
    ? {
        ...activeSelectedFrame,
        thumbnail: processedPreviewSrc
      }
    : null;
  const enabledOperationCount = operations.filter((operation) => operation.enabled).length;
  const isViewChanged = zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0 || viewRotation !== 0;

  return (
    <div className="page-stack selection-page">
      <section className={`selection-layout${showOptionsMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}>
        <PreprocessingOptionsSidebar
          operations={operations}
          selectedCount={selectedRegions.length}
          showMenu={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onOpen={() => setShowOptionsMenu(true)}
          onToggleOperation={handleToggleOperation}
          onKernelSizeChange={handleKernelSizeChange}
        />

        <section className="selection-main panel">
          <ProcessingViewerHeader
            canContinue={selectedRegions.length > 0 && isOpenCvReady}
            enabledOperationCount={enabledOperationCount}
            handleMagnifierSizeChange={handleMagnifierSizeChange}
            handleMagnifierZoomChange={handleMagnifierZoomChange}
            handleRotateLeft={handleRotateLeft}
            handleRotateRight={handleRotateRight}
            handleToggleHoldMode={handleToggleHoldMode}
            handleToggleMagnifierMode={handleToggleMagnifierMode}
            handleToggleZoomMode={handleToggleZoomMode}
            isApplyPending={isApplyPending}
            isHoldMode={isHoldMode}
            isMagnifierMode={isMagnifierMode}
            isViewChanged={isViewChanged}
            isZoomMode={isZoomMode}
            magnifierConfig={magnifierConfig}
            magnifierPopoverRef={magnifierPopoverRef}
            resetView={resetView}
            setShowMagnifierPopover={setShowMagnifierPopover}
            showMagnifierPopover={showMagnifierPopover}
            onContinue={handleContinue}
          />

          <ViewerStage
            activeProgressPercent={0}
            activeRegion={activeRegion}
            activeSelectedFrame={previewFrame}
            activeVideo={null}
            activeVideoFrames={[]}
            className={`viewer-stage${isHoldMode ? " hold-ready" : ""}${isHoldGestureActive ? " hold-active" : ""}${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}${isMagnifierMode ? " magnifier-ready" : ""}${isMagnifierActive ? " magnifier-active" : ""}`}
            currentFrame={0}
            disabledActionMessage=""
            handleRailMouseDown={() => {}}
            handleRailPointerMove={() => {}}
            handleViewerPointerDown={handleViewerPointerDown}
            handleViewerPointerMove={handleViewerPointerMove}
            handleViewerWheel={() => {}}
            isActiveVideoReady={false}
            isMagnifierActive={isMagnifierActive}
            magnifierConfig={magnifierConfig}
            magnifierState={magnifierState}
            onStopViewerInteraction={stopViewerInteraction}
            panOffset={panOffset}
            previewImageRef={previewImageRef}
            scrubberRailRef={null}
            scrubberThumbTop={0}
            selectedFrameRegion={activeRegion}
            showCacheProgress={false}
            stopRailDrag={() => {}}
            viewerMode="frame"
            viewRotation={viewRotation}
            viewerStageRef={viewerStageRef}
            framePlaceholderMessage="Preparing selected frame..."
            viewerOverlayMessage={viewerOverlayMessage}
            zoomOrigin={zoomOrigin}
            zoomScale={zoomScale}
          />
        </section>

        <SelectedFramesSidebar
          onClose={() => setShowSelectedMenu(false)}
          onOpen={() => setShowSelectedMenu(true)}
          onSelectFrame={setActiveRegion}
          regions={regions}
          selectedCount={selectedRegions.length}
          selectedFrameRegion={activeRegion}
          selectedFrames={selectedFrameMap}
          showSelectedMenu={showSelectedMenu}
          viewerMode="frame"
        />
      </section>
    </div>
  );
}
