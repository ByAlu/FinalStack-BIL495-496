import { useEffect, useState } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

export function PreprocessingOptionsSidebar({
  operations,
  showMenu,
  onClose,
  onOpen,
  onToggleOperation,
  onKernelSizeChange,
  selectedCount
}) {
  const [expandedOperationId, setExpandedOperationId] = useState(operations[0]?.id || "");
  const [draftKernelSizes, setDraftKernelSizes] = useState(() =>
    Object.fromEntries(operations.map((operation) => [operation.id, operation.kernelSize]))
  );

  useEffect(() => {
    setDraftKernelSizes(Object.fromEntries(operations.map((operation) => [operation.id, operation.kernelSize])));
  }, [operations]);

  function toggleExpanded(operationId) {
    setExpandedOperationId((current) => (current === operationId ? "" : operationId));
  }

  function handleKernelSizeInput(operationId, kernelSize) {
    setDraftKernelSizes((current) => ({
      ...current,
      [operationId]: kernelSize
    }));
  }

  function commitKernelSize(operationId) {
    const nextKernelSize = draftKernelSizes[operationId];
    const operation = operations.find((item) => item.id === operationId);

    if (!operation || nextKernelSize === operation.kernelSize) {
      return;
    }

    onKernelSizeChange(operationId, nextKernelSize);
  }

  return (
    <aside className={`selection-sidebar preprocessing-sidebar panel${showMenu ? "" : " collapsed"}`}>
      {showMenu ? (
        <>
          <div className="preprocessing-sidebar-header">
            <button className="panel-arrow-toggle" type="button" onClick={onClose}>
              →
            </button>
            <div className="preprocessing-sidebar-copy">
              <span className="selection-toolbar-kicker">Preprocessing</span>
              <strong>Operations</strong>
              <span>{selectedCount} selected frames</span>
            </div>
          </div>

          <div className="preprocessing-operation-list">
            {operations.map((operation) => {
              const isExpanded = expandedOperationId === operation.id;
              const draftKernelSize = draftKernelSizes[operation.id] ?? operation.kernelSize;

              return (
                <section className="preprocessing-operation-card" key={operation.id}>
                  <div className="preprocessing-operation-top preprocessing-operation-top-compact">
                    <label className="preprocessing-operation-toggle">
                      <input
                        checked={operation.enabled}
                        type="checkbox"
                        onChange={(event) => onToggleOperation(operation.id, event.target.checked)}
                      />
                      <span>{operation.label}</span>
                    </label>
                    <button
                      aria-label={isExpanded ? `Collapse ${operation.label}` : `Expand ${operation.label}`}
                      className={`preprocessing-expand-button${isExpanded ? " expanded" : ""}`}
                      type="button"
                      onClick={() => toggleExpanded(operation.id)}
                    >
                      {isExpanded ? (
                        <KeyboardArrowDownRoundedIcon fontSize="small" />
                      ) : (
                        <KeyboardArrowRightRoundedIcon fontSize="small" />
                      )}
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="preprocessing-operation-body">
                      <p>{operation.description}</p>
                      <label className="preprocessing-control-block">
                        <span className="preprocessing-control-label">
                          <span>Kernel size</span>
                          <strong>
                            {draftKernelSize}x{draftKernelSize}
                          </strong>
                        </span>
                        <input
                          className="viewer-fps-slider"
                          disabled={!operation.enabled}
                          max="9"
                          min="3"
                          step="2"
                          type="range"
                          value={draftKernelSize}
                          onChange={(event) => handleKernelSizeInput(operation.id, Number(event.target.value))}
                          onMouseUp={() => commitKernelSize(operation.id)}
                          onTouchEnd={() => commitKernelSize(operation.id)}
                          onKeyUp={(event) => {
                            if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
                              commitKernelSize(operation.id);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ←
        </button>
      )}
    </aside>
  );
}
