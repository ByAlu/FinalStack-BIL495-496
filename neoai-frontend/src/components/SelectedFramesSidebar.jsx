export function SelectedFramesSidebar({
  regions,
  selectedFrames,
  selectedFrameRegion,
  viewerMode,
  showSelectedMenu,
  onClose,
  onOpen,
  onSelectFrame
}) {
  return (
    <aside className={`selected-frames-sidebar panel${showSelectedMenu ? "" : " collapsed"}`}>
      {showSelectedMenu ? (
        <>
          <div className="selected-frames-panel">
            <div className="selected-frames-header">
              <button className="panel-arrow-toggle" type="button" onClick={onClose}>
                ›
              </button>
              <div className="selected-frames-header-copy">
                <span className="selection-toolbar-kicker">Selected</span>
                <strong>Frames</strong>
              </div>
            </div>

            <div className="selected-frames-column">
              {regions.map((region) => {
                const frame = selectedFrames[region];

                return (
                  <button
                    className={`selected-frame-card${selectedFrameRegion === region && viewerMode === "frame" ? " active" : ""}`}
                    key={region}
                    type="button"
                    onClick={() => onSelectFrame(region)}
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
        </>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ‹
        </button>
      )}
    </aside>
  );
}
