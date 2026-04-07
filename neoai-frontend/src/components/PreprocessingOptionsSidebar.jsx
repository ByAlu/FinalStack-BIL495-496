import { useState } from "react";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { getPreprocessingOperationDefinition } from "../config/preprocessingOperations";
import { useOperationDraftValues } from "../hooks/useOperationDraftValues";
import { useOperationReorderDrag } from "../hooks/useOperationReorderDrag";

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
  const {
    commitDraftValue,
    getDraftValue,
    handleDraftValueChange
  } = useOperationDraftValues({
    operations,
    onKernelSizeChange,
    onOperationParameterChange
  });
  const {
    draggedOperationId,
    dropIndicator,
    handleDragStart,
    handleDragOver,
    handleSlotDragOver,
    handleDrop,
    resetDragState
  } = useOperationReorderDrag({ onReorderOperation });

  function toggleExpanded(operationId) {
    setExpandedOperationId((current) => (current === operationId ? "" : operationId));
  }

  function renderControl(operation, control) {
    const draftValue = getDraftValue(operation.id, control.fieldName, operation[control.fieldName]);
    const formattedValue = control.formatValue ? control.formatValue(draftValue) : draftValue;

    return (
      <label key={`${operation.id}-${control.fieldName}`} className="preprocessing-control-block">
        <span className="preprocessing-control-label">
          <span>{control.label}</span>
          <strong>{formattedValue}</strong>
        </span>
        <input
          className="viewer-fps-slider"
          disabled={!operation.enabled}
          max={String(control.max)}
          min={String(control.min)}
          step={String(control.step)}
          type="range"
          value={draftValue}
          onChange={(event) => handleDraftValueChange(operation.id, control.fieldName, Number(event.target.value))}
          onMouseUp={() => commitDraftValue(operation.id, control.fieldName)}
          onTouchEnd={() => commitDraftValue(operation.id, control.fieldName)}
          onKeyUp={(event) => {
            if (event.key.startsWith("Arrow") || event.key === "Home" || event.key === "End") {
              commitDraftValue(operation.id, control.fieldName);
            }
          }}
        />
      </label>
    );
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
              const operationDefinition = getPreprocessingOperationDefinition(operation.type);
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

              return (
                <div key={operation.id}>
                  {showDropBefore ? (
                    <div
                      aria-hidden="true"
                      className="preprocessing-drop-slot"
                      onDragOver={(event) => handleSlotDragOver(event, operation.id, "before")}
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
                        {operationDefinition?.controls.map((control) => renderControl(operation, control))}
                      </div>
                    ) : null}
                  </section>
                  {showDropAfter ? (
                    <div
                      aria-hidden="true"
                      className="preprocessing-drop-slot"
                      onDragOver={(event) => handleSlotDragOver(event, operation.id, "after")}
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
