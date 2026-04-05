export function RegionVideosSidebar({
  examinationId,
  examinationVideos,
  regions,
  activeRegion,
  selectedFrames,
  showVideoMenu,
  onClose,
  onOpen,
  onSelectRegion
}) {
  return (
    <aside className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
      {showVideoMenu ? (
        <>
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Region videos</p>
              <h3>{examinationId}</h3>
            </div>
            <button className="panel-arrow-toggle" type="button" onClick={onClose}>
              ←
            </button>
          </div>

          <div className="region-video-list">
            {regions.map((region) => {
              const regionVideo = examinationVideos.find((video) => video.region === region);
              const isActive = activeRegion === region;
              const isSelected = Boolean(selectedFrames[region]);

              return (
                <button
                  key={region}
                  className={`region-video-item${isActive ? " active" : ""}${isSelected ? " completed" : ""}`}
                  type="button"
                  onClick={() => onSelectRegion(region)}
                >
                  <img
                    alt={`${regionVideo?.name || region} thumbnail`}
                    className="region-video-thumbnail"
                    src={regionVideo?.thumbnail}
                  />
                  <div className="region-video-meta">
                    <strong>{region.toUpperCase()}</strong>
                    <p>{regionVideo?.name || "No video"}</p>
                    <span className={`selection-status${isSelected ? " done" : ""}`}>
                      {isSelected ? "Frame selected" : "Select frame"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          →
        </button>
      )}
    </aside>
  );
}
