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
import { createDefaultPreprocessingOperations, hydratePreprocessingOperations } from "../config/preprocessingOperations";
import { getExaminationByIds } from "../services/examinationApi";
import {
  getCurrentUserPreprocessingSettings,
  saveCurrentUserPreprocessingSettings
} from "../services/preprocessingSettingsApi";
import { applyOperationsToFrame } from "../utils/imageProcessing";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const DEFAULT_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const MAX_MAGNIFIER_CONFIG = { size: 500, zoomFactor: 8 };
const MIN_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const PREVIEW_PROCESSING_DEBOUNCE_MS = 180;
const OPENCV_READY_EVENT = "opencv-ready";
const PREPROCESSING_SETTINGS_DATA_TYPE = "ULTRASOUND";
const BACKEND_PREPROCESSING_CODE_TO_TYPE = {
  MEDIAN_BLUR: "median-filter",
  CLAHE: "clahe",
  GAUSSIAN_BLUR: "gaussian-filter",
  GRAYSCALE: "grayscale",
  SHARPEN: "sharpen"
};
const FRONTEND_PREPROCESSING_TYPE_TO_CODE = {
  "median-filter": "MEDIAN_BLUR",
  clahe: "CLAHE",
  "gaussian-filter": "GAUSSIAN_BLUR",
  grayscale: "GRAYSCALE",
  sharpen: "SHARPEN"
};

function getExaminationCacheKey(patientId, examinationId) {
  return `neoai-cache:${patientId}:${examinationId}`;
}

function getPreprocessingStateCacheKey(patientId, examinationId) {
  return `neoai-preprocessing:${patientId}:${examinationId}`;
}

function getCommittedPreprocessingStateCacheKey(patientId, examinationId) {
  return `neoai-preprocessing-committed:${patientId}:${examinationId}`;
}

function getStoredOperations(preprocessingStateCacheKey, routeOperations) {
  if (Array.isArray(routeOperations) && routeOperations.length > 0) {
    return hydratePreprocessingOperations(routeOperations);
  }

  try {
    const savedState = window.sessionStorage.getItem(preprocessingStateCacheKey);

    if (savedState) {
      const parsedState = JSON.parse(savedState);

      if (Array.isArray(parsedState?.operations) && parsedState.operations.length > 0) {
        return hydratePreprocessingOperations(parsedState.operations);
      }
    }
  } catch {
    return createDefaultPreprocessingOperations();
  }

  return createDefaultPreprocessingOperations();
}

function normalizeBackendSetting(setting) {
  const type = BACKEND_PREPROCESSING_CODE_TO_TYPE[setting?.operationCode];

  if (!type) {
    return null;
  }

  const parameters = { ...(setting?.parameters || {}) };

  if (type === "gaussian-filter" && parameters.sigma !== undefined) {
    if (parameters.sigmaX === undefined) {
      parameters.sigmaX = parameters.sigma;
    }
    if (parameters.sigmaY === undefined) {
      parameters.sigmaY = parameters.sigma;
    }
    delete parameters.sigma;
  }

  return {
    type,
    enabled: Boolean(setting?.active),
    label: setting?.operationName,
    displayOrder: setting?.displayOrder,
    ...parameters
  };
}

function normalizeBackendSettings(settings) {
  const normalizedSettings = Array.isArray(settings)
    ? settings
        .map(normalizeBackendSetting)
        .filter(Boolean)
        .sort((left, right) => (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER))
        .map(({ displayOrder, ...operation }) => operation)
    : [];

  if (normalizedSettings.length === 0) {
    return [];
  }

  return hydratePreprocessingOperations(normalizedSettings, { includeMissingDefinitions: false });
}

function serializeOperationParameters(operation) {
  switch (operation.type) {
    case "median-filter":
      return { kernelSize: operation.kernelSize };
    case "clahe":
      return {
        clipLimit: operation.clipLimit,
        tileGridSize: operation.tileGridSize
      };
    case "gaussian-filter":
      return {
        kernelSize: operation.kernelSize,
        sigmaX: operation.sigmaX,
        sigmaY: operation.sigmaY
      };
    case "grayscale":
      return {};
    case "sharpen":
      return { strength: operation.strength };
    default:
      return {};
  }
}

function serializeOperationsForBackend(operations) {
  return operations
    .map((operation, index) => {
      const operationCode = FRONTEND_PREPROCESSING_TYPE_TO_CODE[operation.type];

      if (!operationCode) {
        return null;
      }

      return {
        operationCode,
        displayOrder: index + 1,
        active: Boolean(operation.enabled),
        parameters: serializeOperationParameters(operation)
      };
    })
    .filter(Boolean);
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
  const routeExamination = location.state?.examination || null;
  const initialRegion = routeExamination?.videos?.[0]?.region || "r1";
  const examinationCacheKey = getExaminationCacheKey(patientId, examinationId);
  const preprocessingStateCacheKey = getPreprocessingStateCacheKey(patientId, examinationId);
  const committedPreprocessingStateCacheKey = getCommittedPreprocessingStateCacheKey(patientId, examinationId);
  const magnifierPopoverRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const [examination, setExamination] = useState(routeExamination);
  const [isLoadingExamination, setIsLoadingExamination] = useState(!routeExamination);
  const [savedOperationsSnapshot, setSavedOperationsSnapshot] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [operations, setOperations] = useState(() =>
    getStoredOperations(preprocessingStateCacheKey, location.state?.preprocessingOperations)
  );
  const [previewOperations, setPreviewOperations] = useState(() => createDefaultPreprocessingOperations());
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
  const [processingErrorMessage, setProcessingErrorMessage] = useState("");
  const [committedOperationsSignature, setCommittedOperationsSignature] = useState(() => {
    const routeOperations = location.state?.preprocessingOperations;

    if (Array.isArray(routeOperations) && routeOperations.length > 0) {
      return JSON.stringify(hydratePreprocessingOperations(routeOperations));
    }

    try {
      const savedCommittedState = window.sessionStorage.getItem(committedPreprocessingStateCacheKey);

      if (!savedCommittedState) {
        return null;
      }

      const parsedCommittedState = JSON.parse(savedCommittedState);

      if (Array.isArray(parsedCommittedState?.operations) && parsedCommittedState.operations.length > 0) {
        return JSON.stringify(hydratePreprocessingOperations(parsedCommittedState.operations));
      }
    } catch {
      return null;
    }

    return null;
  });
  const { selectedFrames, setSelectedFrames } = useSelectionSession({
    patientId,
    examinationId,
    initialRegion
  });

  useEffect(() => {
    let ignore = false;

    async function loadExamination() {
      if (routeExamination) {
        setExamination(routeExamination);
        setIsLoadingExamination(false);
        return;
      }

      setIsLoadingExamination(true);

      try {
        const result = await getExaminationByIds(patientId, examinationId);

        if (!ignore) {
          setExamination(result);
        }
      } catch {
        if (!ignore) {
          setExamination(null);
        }
      } finally {
        if (!ignore) {
          setIsLoadingExamination(false);
        }
      }
    }

    loadExamination();

    return () => {
      ignore = true;
    };
  }, [examinationId, patientId, routeExamination]);

  useEffect(() => {
    let ignore = false;

    async function loadUserPreprocessingSettings() {
      try {
        const settings = await getCurrentUserPreprocessingSettings(PREPROCESSING_SETTINGS_DATA_TYPE);
        const normalizedSettings = normalizeBackendSettings(settings);

        if (ignore) {
          return;
        }

        if (normalizedSettings.length > 0) {
          setOperations(normalizedSettings);
          setSavedOperationsSnapshot(JSON.stringify(normalizedSettings));
          return;
        }
      } catch {
        if (ignore) {
          return;
        }
      }

      if (!ignore) {
        setSavedOperationsSnapshot(JSON.stringify(getStoredOperations(preprocessingStateCacheKey, location.state?.preprocessingOperations)));
      }
    }

    loadUserPreprocessingSettings();

    return () => {
      ignore = true;
    };
  }, [preprocessingStateCacheKey, location.state?.preprocessingOperations]);

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
        : processingErrorMessage;

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
  const [activeRegion, setActiveRegion] = useState(() => {
    const routeRegion = location.state?.activePreprocessingRegion;

    if (routeRegion) {
      return routeRegion;
    }

    try {
      const savedState = window.sessionStorage.getItem(preprocessingStateCacheKey);

      if (savedState) {
        const parsedState = JSON.parse(savedState);

        if (parsedState?.activeRegion) {
          return parsedState.activeRegion;
        }
      }
    } catch {
      return selectedRegions[0] || initialRegion;
    }

    return selectedRegions[0] || initialRegion;
  });

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
    if (operations.length > 0) {
      setPreviewOperations(operations);
    }
  }, [operations]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        preprocessingStateCacheKey,
        JSON.stringify({
          operations,
          activeRegion
        })
      );
    } catch {
      // Ignore session storage failures and keep the page functional.
    }
  }, [activeRegion, operations, preprocessingStateCacheKey]);

  useEffect(() => {
    setProcessedFrames({});
  }, [previewOperations]);

  useEffect(() => {
    let ignore = false;

    async function buildPreview() {
      if (!previewSource) {
        setProcessedPreviewSrc("");
        setProcessingErrorMessage("");
        return;
      }

      if (!isOpenCvReady) {
        setProcessedPreviewSrc("");
        setProcessingErrorMessage("");
        return;
      }

      try {
        const nextPreview = await applyOperationsToFrame(previewSource, previewOperations);

        if (!ignore) {
          setProcessedPreviewSrc(nextPreview);
          if (activeRegion && activeSelectedFrame) {
            setProcessedFrames((current) => ({
              ...current,
              [activeRegion]: {
                ...activeSelectedFrame,
                thumbnail: nextPreview
              }
            }));
          }
          setProcessingErrorMessage("");
        }
      } catch (error) {
        if (!ignore) {
          setProcessedPreviewSrc("");
          setProcessingErrorMessage(error.message || "Preprocessing failed for the selected frame.");
        }
      }
    }

    buildPreview();

    return () => {
      ignore = true;
    };
  }, [activeRegion, activeSelectedFrame, isOpenCvReady, previewOperations, previewSource]);

  const currentOperationsSignature = JSON.stringify(operations);
  const canReset = savedOperationsSnapshot !== null && currentOperationsSignature !== savedOperationsSnapshot;
  const canSave = !isSavingSettings && savedOperationsSnapshot !== null && currentOperationsSignature !== savedOperationsSnapshot;

  async function handleResetOperations() {
    if (!savedOperationsSnapshot) {
      return;
    }

    try {
      const parsedSnapshot = JSON.parse(savedOperationsSnapshot);

      if (Array.isArray(parsedSnapshot) && parsedSnapshot.length > 0) {
        setOperations(parsedSnapshot);
      }
    } catch {
      // Ignore invalid reset snapshots and keep the current unsaved state.
    }
  }

  async function handleSaveOperations() {
    if (!canSave) {
      return;
    }

    setIsSavingSettings(true);

    try {
      const savedSettings = await saveCurrentUserPreprocessingSettings(
        serializeOperationsForBackend(operations),
        PREPROCESSING_SETTINGS_DATA_TYPE
      );
      const normalizedSettings = normalizeBackendSettings(savedSettings);
      const nextOperations = normalizedSettings.length > 0 ? normalizedSettings : operations;

      setOperations(nextOperations);
      setSavedOperationsSnapshot(JSON.stringify(nextOperations));
    } finally {
      setIsSavingSettings(false);
    }
  }

  if (isLoadingExamination) {
    return (
      <div className="page-stack">
        <section className="panel">
          <p>Loading examination...</p>
        </section>
      </div>
    );
  }

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
    setOperations((current) => {
      const currentIndex = current.findIndex((operation) => operation.id === operationId);

      if (currentIndex === -1) {
        return current;
      }

      const next = [...current];
      const [targetOperation] = next.splice(currentIndex, 1);
      const updatedOperation = { ...targetOperation, enabled };

      if (enabled) {
        const firstDisabledIndex = next.findIndex((operation) => !operation.enabled);

        if (firstDisabledIndex === -1) {
          next.push(updatedOperation);
          return next;
        }

        next.splice(firstDisabledIndex, 0, updatedOperation);
        return next;
      }

      next.push(updatedOperation);
      return next;
    });
  }

  function handleKernelSizeChange(operationId, kernelSize) {
    updateOperation(operationId, () => ({ kernelSize }));
  }

  function handleOperationParameterChange(operationId, parameterName, value) {
    updateOperation(operationId, () => ({ [parameterName]: value }));
  }

  function handleReorderOperation(sourceOperationId, targetOperationId, placement = "before") {
    if (sourceOperationId === targetOperationId && placement === "before") {
      return;
    }

    setOperations((current) => {
      const sourceIndex = current.findIndex((operation) => operation.id === sourceOperationId);
      const targetIndex = current.findIndex((operation) => operation.id === targetOperationId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return current;
      }

      if (!current[sourceIndex].enabled || !current[targetIndex].enabled) {
        return current;
      }

      const next = [...current];
      const [movedOperation] = next.splice(sourceIndex, 1);
      let adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;

      if (placement === "after") {
        adjustedTargetIndex += 1;
      }

      next.splice(adjustedTargetIndex, 0, movedOperation);
      return next;
    });
  }

  async function processAllSelectedFrames() {
    const nextEntries = await Promise.all(
      selectedRegions.map(async (region) => {
        if (processedFrames[region]) {
          return [region, processedFrames[region]];
        }

        const frame = selectedFrameMap[region];
        const sourceFrame = getSelectedFrameSource(frame);
        const thumbnail = await applyOperationsToFrame(sourceFrame, operations);
        return [region, { ...frame, thumbnail }];
      })
    );

    return Object.fromEntries(nextEntries);
  }

  async function handleContinue() {
    if (!isOpenCvReady || processingErrorMessage) {
      return;
    }

    setIsApplyPending(true);

    try {
      const nextProcessedFrames =
        Object.keys(processedFrames).length === selectedRegions.length ? processedFrames : await processAllSelectedFrames();
      const nextOperationsSignature = JSON.stringify(operations);

      setProcessedFrames(nextProcessedFrames);
      setActiveWorkflowContext({ patientId, examinationId });

      if (committedOperationsSignature !== nextOperationsSignature) {
        resetWorkflowAfterStep(patientId, examinationId, 3);
        setCommittedOperationsSignature(nextOperationsSignature);

        try {
          window.sessionStorage.setItem(
            committedPreprocessingStateCacheKey,
            JSON.stringify({
              operations
            })
          );
        } catch {
          // Ignore session storage failures and keep the page functional.
        }
      }

      navigate(`/ai-module/${patientId}/${examinationId}`, {
        state: {
          activePreprocessingRegion: activeRegion,
          patientId,
          examinationId,
          examination,
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
          canReset={canReset}
          canSave={canSave}
          isSaving={isSavingSettings}
          operations={operations}
          onReset={handleResetOperations}
          showMenu={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onOpen={() => setShowOptionsMenu(true)}
          onSave={handleSaveOperations}
          onToggleOperation={handleToggleOperation}
          onKernelSizeChange={handleKernelSizeChange}
          onOperationParameterChange={handleOperationParameterChange}
          onReorderOperation={handleReorderOperation}
        />

        <section className="selection-main panel">
          <ProcessingViewerHeader
            canContinue={selectedRegions.length > 0 && isOpenCvReady && !processingErrorMessage}
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
          selectedFrameRegion={activeRegion}
          selectedFrames={selectedFrameMap}
          showSelectedMenu={showSelectedMenu}
          viewerMode="frame"
        />
      </section>
    </div>
  );
}
