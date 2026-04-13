import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";

export function PreprocessingOperationCard({
  operation,
  enabledOperationIndex,
  isDragged,
  isExpanded,
  isReorderable,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggleExpanded,
  onToggleOperation,
  renderControls
}) {
  return (
    <section
      className={`preprocessing-operation-card${isDragged ? " dragging" : ""}`}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
              onDragEnd={onDragEnd}
              onDragStart={onDragStart}
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
            onClick={onToggleExpanded}
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
          {renderControls()}
        </div>
      ) : null}
    </section>
  );
}
