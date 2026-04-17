export function AiModuleOptionsSidebar({
  modules,
  selectedModuleIds,
  showMenu,
  onClose,
  onOpen,
  onToggleModule,
  isLoading,
  errorMessage
}) {
  return (
    <aside className={`selection-sidebar preprocessing-sidebar ai-module-sidebar panel${showMenu ? "" : " collapsed"}`}>
      {showMenu ? (
        <div className="preprocessing-sidebar-header">
          <button className="panel-arrow-toggle" type="button" onClick={onClose}>
            ‹
          </button>
          <div className="preprocessing-sidebar-copy">
            <span className="selection-toolbar-kicker">AI Module</span>
            <strong>Options</strong>
            <span>Choose the analysis module to run for the processed frames.</span>
          </div>
        </div>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}

      {showMenu ? (
        <div className="preprocessing-operation-list ai-module-option-list">
          {isLoading ? <p>Loading AI modules...</p> : null}
          {!isLoading && errorMessage ? <p>{errorMessage}</p> : null}
          {!isLoading && !errorMessage && modules.length === 0 ? <p>No AI modules are currently available.</p> : null}
          {!isLoading && !errorMessage
            ? modules.map((moduleOption) => {
                const isActive = selectedModuleIds.includes(moduleOption.id);

                return (
                  <button
                    key={moduleOption.id}
                    className={`preprocessing-operation-card ai-module-option-card${isActive ? " active" : ""}`}
                    type="button"
                    onClick={() => onToggleModule(moduleOption.id)}
                  >
                    <div className="preprocessing-operation-top">
                      <div className="ai-module-option-copy">
                        <p>{moduleOption.label}</p>
                        <span>{moduleOption.description}</span>
                      </div>
                      <span className={`ai-module-option-indicator${isActive ? " active" : ""}`} aria-hidden="true" />
                    </div>
                  </button>
                );
              })
            : null}
        </div>
      ) : null}
    </aside>
  );
}
