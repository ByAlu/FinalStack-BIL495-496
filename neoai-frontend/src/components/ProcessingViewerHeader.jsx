import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import RotateLeftRoundedIcon from "@mui/icons-material/RotateLeftRounded";
import RotateRightRoundedIcon from "@mui/icons-material/RotateRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ZoomOutMapRoundedIcon from "@mui/icons-material/ZoomOutMapRounded";
import { SelectionToolbar } from "./SelectionToolbar";

export function ProcessingViewerHeader({
  isHoldMode,
  isZoomMode,
  isMagnifierMode,
  isViewChanged,
  magnifierConfig,
  magnifierPopoverRef,
  showMagnifierPopover,
  setShowMagnifierPopover,
  handleToggleHoldMode,
  handleToggleZoomMode,
  handleToggleMagnifierMode,
  handleMagnifierSizeChange,
  handleMagnifierZoomChange,
  handleRotateLeft,
  handleRotateRight,
  resetView,
  enabledOperationCount,
  isApplyPending,
  onContinue,
  canContinue
}) {
  return (
    <div className="selection-viewer-header">
      <div className="viewer-header-actions">
        <div className="viewer-header-side viewer-header-side-left">
          <SelectionToolbar ariaLabel="Preprocessing viewer tools">
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
              title={isZoomMode ? "Disable zoom mode" : "Enable zoom mode"}
            >
              <SearchRoundedIcon fontSize="small" />
            </button>
            <button
              aria-label={isMagnifierMode ? "Disable magnifier tool" : "Enable magnifier tool"}
              className={`selection-toolbar-icon-button${isMagnifierMode ? " active" : ""}`}
              type="button"
              onClick={handleToggleMagnifierMode}
              title={isMagnifierMode ? "Disable magnifier tool" : "Enable magnifier tool"}
            >
              <ZoomOutMapRoundedIcon fontSize="small" />
            </button>
            {isMagnifierMode ? (
              <span className="selection-toolbar-expander" ref={magnifierPopoverRef}>
                <span aria-hidden="true" className="selection-toolbar-expander-divider" />
                <button
                  aria-label="Open magnifier options"
                  className="selection-toolbar-expander-button"
                  type="button"
                  onClick={() => setShowMagnifierPopover((current) => !current)}
                  title="Open magnifier options"
                >
                  <KeyboardArrowDownRoundedIcon fontSize="small" />
                </button>
                {showMagnifierPopover ? (
                  <div className="viewer-tool-popover viewer-magnifier-popover">
                    <label className="viewer-tool-popover-label">
                      <span className="viewer-tool-popover-label-row">
                        <span>Magnifier area</span>
                        <strong>{magnifierConfig.size}px</strong>
                      </span>
                      <input
                        aria-label="Magnifier area slider"
                        className="viewer-fps-slider"
                        max="500"
                        min="200"
                        step="1"
                        type="range"
                        value={magnifierConfig.size}
                        onChange={(event) => handleMagnifierSizeChange(Number(event.target.value))}
                      />
                    </label>
                    <label className="viewer-tool-popover-label">
                      <span className="viewer-tool-popover-label-row">
                        <span>Magnifier zoom</span>
                        <strong>{magnifierConfig.zoomFactor.toFixed(1)}x</strong>
                      </span>
                      <input
                        aria-label="Magnifier zoom slider"
                        className="viewer-fps-slider"
                        max="8"
                        min="2"
                        step="0.5"
                        type="range"
                        value={magnifierConfig.zoomFactor}
                        onChange={(event) => handleMagnifierZoomChange(Number(event.target.value))}
                      />
                    </label>
                  </div>
                ) : null}
              </span>
            ) : null}
            <button
              aria-label="Rotate view 90 degree left"
              className="selection-toolbar-icon-button"
              type="button"
              onClick={handleRotateLeft}
              title="Rotate view 90 degree left"
            >
              <RotateLeftRoundedIcon fontSize="small" />
            </button>
            <button
              aria-label="Rotate view 90 degree right"
              className="selection-toolbar-icon-button"
              type="button"
              onClick={handleRotateRight}
              title="Rotate view 90 degree right"
            >
              <RotateRightRoundedIcon fontSize="small" />
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
          <div className="viewer-control-cluster preprocessing-center-chip">
            {enabledOperationCount > 0 ? `${enabledOperationCount} operation enabled` : "No operations enabled"}
          </div>
        </div>

        <div className="viewer-header-side viewer-header-side-right">
          <div className="viewer-primary-actions">
            <button className="primary-button" type="button" onClick={onContinue} disabled={!canContinue || isApplyPending}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
