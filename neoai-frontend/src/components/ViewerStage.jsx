export function ViewerStage({
  activeRegion,
  activeSelectedFrame,
  activeVideo,
  activeVideoFrames,
  activeProgressPercent,
  className,
  currentFrame,
  disabledActionMessage,
  handleViewerPointerDown,
  handleViewerPointerMove,
  handleViewerWheel,
  isActiveVideoReady,
  onStopViewerInteraction,
  panOffset,
  previewImageRef,
  scrubberRailRef,
  scrubberThumbTop,
  selectedFrameRegion,
  showCacheProgress,
  stopRailDrag,
  handleRailMouseDown,
  handleRailPointerMove,
  viewerMode,
  viewerStageRef,
  zoomOrigin,
  zoomScale
}) {
  const activeFrameSrc =
    isActiveVideoReady && activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]
      ? activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]
      : "";

  return (
    <div className="viewer-shell">
      <div
        className={className}
        onLostPointerCapture={onStopViewerInteraction}
        onPointerCancel={onStopViewerInteraction}
        onPointerDown={handleViewerPointerDown}
        onPointerMove={handleViewerPointerMove}
        onPointerUp={onStopViewerInteraction}
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
            {activeFrameSrc ? (
              <img
                alt={`${activeRegion} frame ${currentFrame + 1}`}
                className="selection-frame-preview"
                ref={previewImageRef}
                src={activeFrameSrc}
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
              {showCacheProgress ? <span className="viewer-cache-status">Caching {activeProgressPercent}%</span> : null}
              <span className="viewer-frame-status">
                Frame {isActiveVideoReady ? Math.min(currentFrame + 1, Math.max(activeVideoFrames.length, 1)) : 0} /{" "}
                {Math.max(activeVideoFrames.length, 0)}
              </span>
            </div>
            {disabledActionMessage ? <div className="viewer-disabled-action-message">{disabledActionMessage}</div> : null}
          </>
        ) : (
          <div className="viewer-placeholder">No video selected</div>
        )}
      </div>
    </div>
  );
}
