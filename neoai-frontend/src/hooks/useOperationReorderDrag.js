import { useRef, useState } from "react";

export function useOperationReorderDrag({ onReorderOperation }) {
  const [draggedOperationId, setDraggedOperationId] = useState("");
  const [dropIndicator, setDropIndicator] = useState(null);
  const draggedOperationIdRef = useRef("");

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

  function handleSlotDragOver(event, operationId, placement) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
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

  return {
    draggedOperationId,
    dropIndicator,
    handleDragStart,
    handleDragOver,
    handleSlotDragOver,
    handleDrop,
    resetDragState
  };
}
