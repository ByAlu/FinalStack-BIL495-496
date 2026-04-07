import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { AiResultsModulesSidebar } from "../components/AiResultsModulesSidebar";
import { AiViewerToolbar } from "../components/AiViewerToolbar";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { aiRegionResults } from "../data/mockData";
import { useViewerHold } from "../hooks/useViewerHold";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { getReportById } from "../services/mockApi";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const RESULT_IMAGE_WIDTH = 400;
const RESULT_IMAGE_HEIGHT = 400;
const DEFAULT_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const MAX_MAGNIFIER_CONFIG = { size: 500, zoomFactor: 8 };
const MIN_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };

function formatSeverityLabel(value) {
  return value.split("_").join(" ");
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

export function AiResultsPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const magnifierPopoverRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const report = useMemo(() => getReportById(reportId), [reportId]);
  const selectedFrameMap = location.state?.processedFrames || location.state?.selectedFrames || {};
  const selectedRegions = useMemo(() => regions.filter((region) => selectedFrameMap[region]), [selectedFrameMap]);
  const selectedModuleIds = useMemo(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return location.state.selectedModuleIds;
    }

    if (location.state?.selectedModuleId) {
      return [location.state.selectedModuleId];
    }

    return ["rds-score"];
  }, [location.state]);
  const [showResultsMenu, setShowResultsMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [enabledModuleIds, setEnabledModuleIds] = useState(selectedModuleIds);
  const [activeRegion, setActiveRegion] = useState(selectedRegions[0] || "r1");
  const [imageAspectRatio, setImageAspectRatio] = useState(1.68);
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

  const activeSelectedFrame = activeRegion ? selectedFrameMap[activeRegion] || null : null;
  const activeRegionResult = aiRegionResults[activeRegion] || null;
  const bLineResult = activeRegionResult?.b_line_module || null;
  const rdsScoreResult = activeRegionResult?.rds_score_module || null;
  const isBLineEnabled = enabledModuleIds.includes("b-line");
  const isRdsScoreEnabled = enabledModuleIds.includes("rds-score");
  const visibleSummaryLines = [
    `Region ${activeRegionResult?.region || activeRegion.toUpperCase()} · image quality ${activeRegionResult?.image_quality || "unknown"}`,
    isBLineEnabled && bLineResult
      ? `B-LINE: ${bLineResult.b_line_count} lines, ${bLineResult.pattern} pattern, pleural line ${bLineResult.pleural_line.status}`
      : null,
    isRdsScoreEnabled && rdsScoreResult
      ? `RDS-SCORE: ${rdsScoreResult.region_score} (${formatSeverityLabel(rdsScoreResult.severity_label)}), confidence %${Math.round(rdsScoreResult.confidence * 100)}`
      : null
  ].filter(Boolean);
  const isViewChanged = zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0 || viewRotation !== 0;

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

  if (!report) {
    return (
      <section className="panel">
        <h2>Results not found</h2>
      </section>
    );
  }

  if (selectedRegions.length === 0) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>No processed frames found</h2>
          <p>Complete AI module selection before opening AI results.</p>
          <Link className="secondary-button" to="/query">
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  function handleToggleModule(moduleId) {
    setEnabledModuleIds((current) =>
      current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]
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

  return (
    <div className="page-stack selection-page">
      <section className={`selection-layout${showResultsMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}>
        <AiResultsModulesSidebar
          moduleIds={selectedModuleIds}
          enabledModuleIds={enabledModuleIds}
          showMenu={showResultsMenu}
          onClose={() => setShowResultsMenu(false)}
          onOpen={() => setShowResultsMenu(true)}
          onToggleModule={handleToggleModule}
        />

        <section className="selection-main panel">
          <AiViewerToolbar
            centerContent={
              <div className="viewer-control-cluster preprocessing-center-chip ai-module-center-chip">
                {enabledModuleIds.length > 0 ? `${enabledModuleIds.length} result overlay active` : "No result overlay active"}
              </div>
            }
            handleMagnifierSizeChange={handleMagnifierSizeChange}
            handleMagnifierZoomChange={handleMagnifierZoomChange}
            handleRotateLeft={handleRotateLeft}
            handleRotateRight={handleRotateRight}
            handleToggleHoldMode={handleToggleHoldMode}
            handleToggleMagnifierMode={handleToggleMagnifierMode}
            handleToggleZoomMode={handleToggleZoomMode}
            isHoldMode={isHoldMode}
            isMagnifierMode={isMagnifierMode}
            isViewChanged={isViewChanged}
            isZoomMode={isZoomMode}
            magnifierConfig={magnifierConfig}
            magnifierPopoverRef={magnifierPopoverRef}
            resetView={resetView}
            rightContent={null}
            setShowMagnifierPopover={setShowMagnifierPopover}
            showMagnifierPopover={showMagnifierPopover}
          />

          <div className="viewer-shell">
            <div
              className={`viewer-stage ai-results-stage${isHoldMode ? " hold-ready" : ""}${isHoldGestureActive ? " hold-active" : ""}${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}${isMagnifierMode ? " magnifier-ready" : ""}${isMagnifierActive ? " magnifier-active" : ""}`}
              onLostPointerCapture={stopViewerInteraction}
              onPointerCancel={stopViewerInteraction}
              onPointerDown={handleViewerPointerDown}
              onPointerMove={handleViewerPointerMove}
              onPointerUp={stopViewerInteraction}
              ref={viewerStageRef}
            >
              {activeSelectedFrame?.thumbnail ? (
                <div
                  className="ai-results-image-frame"
                  ref={previewImageRef}
                  style={{
                    "--ai-result-aspect-ratio": imageAspectRatio,
                    transform: `translate(calc(-50% + ${panOffset.x}px), ${panOffset.y}px) rotate(${viewRotation}deg) scale(${zoomScale})`,
                    transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
                  }}
                >
                  <img
                    alt={`${activeRegion} AI result`}
                    className="ai-results-image"
                    onLoad={(event) => {
                      const { naturalWidth, naturalHeight } = event.currentTarget;

                      if (naturalWidth > 0 && naturalHeight > 0) {
                        setImageAspectRatio(naturalWidth / naturalHeight);
                      }
                    }}
                    src={activeSelectedFrame.thumbnail}
                  />
                  {isRdsScoreEnabled && rdsScoreResult?.explainability?.heatmap_available ? (
                    <div className={`ai-results-heatmap-overlay region-${activeRegion}`} aria-hidden="true" />
                  ) : null}
                  {isBLineEnabled && bLineResult
                    ? bLineResult.bounding_boxes.map((box, index) => (
                        <div
                          key={`${activeRegion}-bbox-${index}`}
                          className="ai-results-bounding-box"
                          style={{
                            left: `${(box.x_min / RESULT_IMAGE_WIDTH) * 100}%`,
                            top: `${(box.y_min / RESULT_IMAGE_HEIGHT) * 100}%`,
                            width: `${((box.x_max - box.x_min) / RESULT_IMAGE_WIDTH) * 100}%`,
                            height: `${((box.y_max - box.y_min) / RESULT_IMAGE_HEIGHT) * 100}%`
                          }}
                        >
                          <span>%{Math.round(box.confidence * 100)}</span>
                        </div>
                      ))
                    : null}
                </div>
              ) : (
                <div className="viewer-placeholder viewer-loading-state">Preparing result image...</div>
              )}

              {isMagnifierActive && activeSelectedFrame?.thumbnail ? (
                <div
                  aria-hidden="true"
                  className="viewer-magnifier"
                  style={{
                    left: `${magnifierState.x}px`,
                    top: `${magnifierState.y}px`,
                    width: `${magnifierConfig.size}px`,
                    height: `${magnifierConfig.size}px`,
                    backgroundImage: `url("${activeSelectedFrame.thumbnail}")`,
                    backgroundPosition: `${magnifierState.backgroundOffsetX}px ${magnifierState.backgroundOffsetY}px`,
                    backgroundSize: `${magnifierState.backgroundWidth}px ${magnifierState.backgroundHeight}px`
                  }}
                />
              ) : null}

              <div className="ai-results-summary">
                {enabledModuleIds.length > 0 ? (
                  visibleSummaryLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))
                ) : (
                  <p>Enable a module from the left panel to display its results on the image.</p>
                )}
              </div>
            </div>
          </div>
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
