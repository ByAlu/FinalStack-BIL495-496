import { useState } from "react";

function RegionVideoThumbnail({ thumbnail, region, name }) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!thumbnail || hasImageError) {
    return (
      <div className="region-video-thumbnail region-video-thumbnail-placeholder">
        {region.toUpperCase()}
      </div>
    );
  }

  return (
    <img
      alt={`${name || region} thumbnail`}
      className="region-video-thumbnail"
      src={thumbnail}
      onError={() => setHasImageError(true)}
    />
  );
}

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
          <div className="region-videos-sidebar-header">
            <div className="region-videos-sidebar-copy">
              <span className="selection-toolbar-kicker">Region Videos</span>
              <strong>{examinationId}</strong>
            </div>
            <button className="panel-arrow-toggle" type="button" onClick={onClose}>
              &lsaquo;
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
                  <RegionVideoThumbnail
                    thumbnail={regionVideo?.thumbnail}
                    region={region}
                    name={regionVideo?.name}
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
          &rsaquo;
        </button>
      )}
    </aside>
  );
}