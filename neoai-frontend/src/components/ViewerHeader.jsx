import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import { SelectionToolbar } from "./SelectionToolbar";

export function ViewerHeader({
  isHoldMode,
  isZoomMode,
  activeVideo,
  activeSelectedFrame,
  viewerMode,
  isViewChanged,
  handleToggleHoldMode,
  handleToggleZoomMode,
  resetView,
  isPlaying,
  handleTogglePlay,
  fps,
  setFps,
  adjustFps,
  showFpsPopover,
  setShowFpsPopover,
  fpsPopoverRef,
  isCurrentFrameAlreadySelected,
  showDisabledActionMessage,
  clearDisabledActionMessage,
  handleSelectFrame,
  isActiveVideoReady,
  activeVideoFrames,
  currentFrame,
  isApprovedReady,
  handleApprove
}) {
  return (
    <div className="selection-viewer-header">
      <div className="viewer-header-actions">
        <div className="viewer-header-side viewer-header-side-left">
          <SelectionToolbar ariaLabel="Viewer tools">
            <button
              aria-label={isHoldMode ? "Disable hold tool" : "Enable hold tool"}
              className={`selection-toolbar-icon-button${isHoldMode ? " active" : ""}`}
              type="button"
              onClick={handleToggleHoldMode}
              title={isHoldMode ? "Disable hold tool" : "Enable hold tool"}
            >
              <OpenWithRoundedIcon fontSize="small" />
            </button>
            <button
              aria-label={isZoomMode ? "Disable zoom mode" : "Enable zoom mode"}
              className={`selection-toolbar-icon-button selection-toolbar-icon-button-zoom${isZoomMode ? " active" : ""}`}
              type="button"
              onClick={handleToggleZoomMode}
              disabled={!activeVideo && !(viewerMode === "frame" && activeSelectedFrame)}
              title={isZoomMode ? "Disable zoom mode" : "Enable zoom mode"}
            >
              <ZoomInRoundedIcon fontSize="small" />
            </button>
            <button
              aria-label="Reset view"
              className="selection-toolbar-icon-button"
              type="button"
              onClick={resetView}
              disabled={!isViewChanged}
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
          <div className="viewer-primary-actions">
            <span
              onMouseEnter={() => {
                if (isCurrentFrameAlreadySelected) {
                  showDisabledActionMessage("This frame is already selected.");
                }
              }}
              onMouseLeave={clearDisabledActionMessage}
            >
              <button
                className="primary-button"
                type="button"
                onClick={handleSelectFrame}
                disabled={
                  viewerMode !== "video" ||
                  !isActiveVideoReady ||
                  !activeVideoFrames[currentFrame] ||
                  isCurrentFrameAlreadySelected
                }
              >
                Select Frame
              </button>
            </span>
            <span
              onMouseEnter={() => {
                if (!isApprovedReady) {
                  showDisabledActionMessage("Select 6 frames, one from each region, before approving.");
                }
              }}
              onMouseLeave={clearDisabledActionMessage}
            >
              <button className="primary-button" disabled={!isApprovedReady} type="button" onClick={handleApprove}>
                Approve
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
