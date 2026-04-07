import React from 'react';

const PlayControls = ({ isPlaying, handleTogglePlay, fps, setFps, showFpsPopover, setShowFpsPopover, adjustFps, fpsPopoverRef }) => {
  return (
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
  );
};

export default PlayControls;