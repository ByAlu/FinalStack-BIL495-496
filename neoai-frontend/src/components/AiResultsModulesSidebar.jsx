const MODULE_LABELS = {
  "rds-score": {
    title: "RDS-SCORE",
    description: "Show aeration score and confidence."
  },
  "b-line": {
    title: "B-LINE",
    description: "Show detected B-line boxes and pleural-line related findings."
  }
};

export function AiResultsModulesSidebar({ moduleIds, enabledModuleIds, showMenu, onClose, onOpen, onToggleModule }) {
  return (
    <aside className={`selection-sidebar preprocessing-sidebar ai-module-sidebar panel${showMenu ? "" : " collapsed"}`}>
      {showMenu ? (
        <div className="preprocessing-sidebar-header">
          <button className="panel-arrow-toggle" type="button" onClick={onClose}>
            ‹
          </button>
          <div className="preprocessing-sidebar-copy">
            <span className="selection-toolbar-kicker">AI Results</span>
            <strong>Selected Modules</strong>
            <span>Toggle selected modules to show or hide their visual results on the image.</span>
          </div>
        </div>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}

      {showMenu ? (
        <div className="preprocessing-operation-list ai-module-option-list">
          {moduleIds.map((moduleId) => {
            const moduleMeta = MODULE_LABELS[moduleId];
            const isActive = enabledModuleIds.includes(moduleId);

            if (!moduleMeta) {
              return null;
            }

            return (
              <button
                key={moduleId}
                className={`preprocessing-operation-card ai-module-option-card${isActive ? " active" : ""}`}
                type="button"
                onClick={() => onToggleModule(moduleId)}
              >
                <div className="preprocessing-operation-top">
                  <div className="ai-module-option-copy">
                    <p>{moduleMeta.title}</p>
                    <span>{moduleMeta.description}</span>
                  </div>
                  <span className={`ai-module-option-indicator${isActive ? " active" : ""}`} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
