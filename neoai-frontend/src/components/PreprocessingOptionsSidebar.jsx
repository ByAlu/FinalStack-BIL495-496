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
  onOperationParameterChange
}) {
  const [expandedOperationId, setExpandedOperationId] = useState(operations[0]?.id || "");
  const [draftValues, setDraftValues] = useState(() =>
    Object.fromEntries(
      operations.map((operation) => [
        operation.id,
        {
          kernelSize: operation.kernelSize,
          clipLimit: operation.clipLimit,
          strength: operation.strength
        }
      ])
    )
  );

  useEffect(() => {
    setDraftValues(
      Object.fromEntries(
        operations.map((operation) => [
          operation.id,
          {
            kernelSize: operation.kernelSize,
            clipLimit: operation.clipLimit,
            strength: operation.strength
          }
        ])
      )
    );
  }, [operations]);

  function toggleExpanded(operationId) {
    setExpandedOperationId((current) => (current === operationId ? "" : operationId));
  }

  function handleDraftValueChange(operationId, fieldName, value) {
    setDraftValues((current) => ({
      ...current,
      [operationId]: {
        ...current[operationId],
        [fieldName]: value
      }
    }));
  }

  function commitDraftValue(operationId, fieldName) {
    const operation = operations.find((item) => item.id === operationId);
    const nextValue = draftValues[operationId]?.[fieldName];

    if (!operation || nextValue === undefined || nextValue === operation[fieldName]) {
      return;
    }

    if (fieldName === "kernelSize") {
      onKernelSizeChange(operationId, nextValue);
      return;
    }

    onOperationParameterChange(operationId, fieldName, nextValue);
  }

  return (
    <aside className={`selection-sidebar preprocessing-sidebar panel${showMenu ? "" : " collapsed"}`}>
      {showMenu ? (
        <>
          <div className="preprocessing-sidebar-header">
            <button className="panel-arrow-toggle" type="button" onClick={onClose}>
              ‹
            </button>
            <div className="preprocessing-sidebar-copy">
              <span className="selection-toolbar-kicker">Preprocessing</span>
              <strong>Operations</strong>
            </div>
          </div>

          <div className="preprocessing-operation-list">
            {operations.map((operation) => {
              const isExpanded = expandedOperationId === operation.id;
              const draftKernelSize = draftValues[operation.id]?.kernelSize ?? operation.kernelSize;
              const draftClipLimit = draftValues[operation.id]?.clipLimit ?? operation.clipLimit;
              const draftStrength = draftValues[operation.id]?.strength ?? operation.strength;

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
                      {operation.type === "median-filter" ? (
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
                            max="15"
                            min="3"
                            step="2"
                            type="range"
                            value={draftKernelSize}
                            onChange={(event) => handleDraftValueChange(operation.id, "kernelSize", Number(event.target.value))}
                            onMouseUp={() => commitDraftValue(operation.id, "kernelSize")}
                            onTouchEnd={() => commitDraftValue(operation.id, "kernelSize")}
                            onKeyUp={(event) => {
                              if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
                                commitDraftValue(operation.id, "kernelSize");
                              }
                            }}
                          />
                        </label>
                      ) : null}
                      {operation.type === "clahe" ? (
                        <label className="preprocessing-control-block">
                          <span className="preprocessing-control-label">
                            <span>Clip limit</span>
                            <strong>{draftClipLimit.toFixed(1)}</strong>
                          </span>
                          <input
                            className="viewer-fps-slider"
                            disabled={!operation.enabled}
                            max="8"
                            min="1"
                            step="0.5"
                            type="range"
                            value={draftClipLimit}
                            onChange={(event) => handleDraftValueChange(operation.id, "clipLimit", Number(event.target.value))}
                            onMouseUp={() => commitDraftValue(operation.id, "clipLimit")}
                            onTouchEnd={() => commitDraftValue(operation.id, "clipLimit")}
                            onKeyUp={(event) => {
                              if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
                                commitDraftValue(operation.id, "clipLimit");
                              }
                            }}
                          />
                        </label>
                      ) : null}
                      {operation.type === "sharpen" ? (
                        <label className="preprocessing-control-block">
                          <span className="preprocessing-control-label">
                            <span>Strength</span>
                            <strong>{draftStrength.toFixed(1)}x</strong>
                          </span>
                          <input
                            className="viewer-fps-slider"
                            disabled={!operation.enabled}
                            max="4"
                            min="1"
                            step="0.5"
                            type="range"
                            value={draftStrength}
                            onChange={(event) => handleDraftValueChange(operation.id, "strength", Number(event.target.value))}
                            onMouseUp={() => commitDraftValue(operation.id, "strength")}
                            onTouchEnd={() => commitDraftValue(operation.id, "strength")}
                            onKeyUp={(event) => {
                              if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
                                commitDraftValue(operation.id, "strength");
                              }
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}
    </aside>
  );
}
