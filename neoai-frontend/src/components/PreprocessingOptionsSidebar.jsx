import { useEffect, useRef, useState } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

export function PreprocessingOptionsSidebar({
  operations,
  showMenu,
  onClose,
  onOpen,
  onToggleOperation,
  onKernelSizeChange,
  onOperationParameterChange,
  onReorderOperation
}) {
  const [expandedOperationId, setExpandedOperationId] = useState(operations[0]?.id || "");
  const [draggedOperationId, setDraggedOperationId] = useState("");
  const [dropIndicator, setDropIndicator] = useState(null);
  const draggedOperationIdRef = useRef("");
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

  function handleDragStart(event, operationId, isReorderable) {
    if (!isReorderable) {
      event.preventDefault();
      return;
    }

    draggedOperationIdRef.current = operationId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", operationId);
    setDraggedOperationId(operationId);
    setDropIndicator({ operationId, placement: "before" });
  }

  function handleDragOver(event, operationId, isReorderable) {
    const activeDraggedOperationId = draggedOperationIdRef.current;

    if (!activeDraggedOperationId || !isReorderable || activeDraggedOperationId === operationId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    setDropIndicator({ operationId, placement });
  }

  function handleDrop(event, operationId, isReorderable, explicitPlacement) {
    event.preventDefault();
    const activeDraggedOperationId = draggedOperationIdRef.current;

    if (!activeDraggedOperationId || !isReorderable || activeDraggedOperationId === operationId) {
      resetDragState();
      return;
    }

    const placement =
      explicitPlacement || (dropIndicator?.operationId === operationId ? dropIndicator.placement : "before");
    onReorderOperation(activeDraggedOperationId, operationId, placement);
    resetDragState();
  }

  function resetDragState() {
    draggedOperationIdRef.current = "";
    setDraggedOperationId("");
    setDropIndicator(null);
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
              const operationIndex = operations.findIndex((item) => item.id === operation.id);
              const enabledOperations = operations.filter((item) => item.enabled);
              const enabledOperationIndex = enabledOperations.findIndex((item) => item.id === operation.id);
              const firstDisabledIndex = operations.findIndex((item) => !item.enabled);
              const shouldRenderDivider = firstDisabledIndex > 0 && operationIndex === firstDisabledIndex;
              const isReorderable = operation.enabled && enabledOperations.length > 0;
              const isDragged = draggedOperationId === operation.id;
              const showDropBefore =
                dropIndicator?.operationId === operation.id &&
                dropIndicator.placement === "before" &&
                draggedOperationId &&
                draggedOperationId !== operation.id;
              const showDropAfter =
                dropIndicator?.operationId === operation.id &&
                dropIndicator.placement === "after" &&
                draggedOperationId &&
                draggedOperationId !== operation.id;
              const draftKernelSize = draftValues[operation.id]?.kernelSize ?? operation.kernelSize;
              const draftClipLimit = draftValues[operation.id]?.clipLimit ?? operation.clipLimit;
              const draftStrength = draftValues[operation.id]?.strength ?? operation.strength;

              return (
                <div key={operation.id}>
                  {showDropBefore ? (
                    <div
                      aria-hidden="true"
                      className="preprocessing-drop-slot"
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropIndicator({ operationId: operation.id, placement: "before" });
                      }}
                      onDrop={(event) => handleDrop(event, operation.id, isReorderable, "before")}
                    />
                  ) : null}
                  {shouldRenderDivider ? <div className="preprocessing-operation-divider" aria-hidden="true" /> : null}
                  <section
                    className={`preprocessing-operation-card${isDragged ? " dragging" : ""}`}
                    onDragEnd={resetDragState}
                    onDragOver={(event) => handleDragOver(event, operation.id, isReorderable)}
                    onDrop={(event) => handleDrop(event, operation.id, isReorderable)}
                  >
                    <div className="preprocessing-operation-top preprocessing-operation-top-compact">
                      <div className="preprocessing-operation-toggle">
                        {isReorderable ? (
                          <button
                            aria-label={`Drag to reorder ${operation.label}`}
                            className="preprocessing-order-badge preprocessing-order-drag-handle"
                            draggable
                            title={`Drag to reorder ${operation.label}`}
                            type="button"
                            onDragEnd={resetDragState}
                            onDragStart={(event) => handleDragStart(event, operation.id, isReorderable)}
                          >
                            #{enabledOperationIndex + 1}
                          </button>
                        ) : (
                          <span className="preprocessing-drag-spacer" aria-hidden="true" />
                        )}
                        <input
                          aria-label={`Enable ${operation.label}`}
                          checked={operation.enabled}
                          type="checkbox"
                          onChange={(event) => onToggleOperation(operation.id, event.target.checked)}
                        />
                        <span>{operation.label}</span>
                      </div>
                      <div className="preprocessing-operation-actions">
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
                  {showDropAfter ? (
                    <div
                      aria-hidden="true"
                      className="preprocessing-drop-slot"
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setDropIndicator({ operationId: operation.id, placement: "after" });
                      }}
                      onDrop={(event) => handleDrop(event, operation.id, isReorderable, "after")}
                    />
                  ) : null}
                </div>
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
