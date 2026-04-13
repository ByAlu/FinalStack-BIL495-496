import { useEffect, useRef, useState } from "react";

const DEFAULT_PAN_OFFSET = { x: 0, y: 0 };

export function useViewerHold({ viewerStageRef, resetDependencies = [] }) {
  const activeHoldPointerIdRef = useRef(null);
  const holdGestureRef = useRef(null);
  const [isHoldMode, setIsHoldMode] = useState(false);
  const [panOffset, setPanOffset] = useState(DEFAULT_PAN_OFFSET);

  function resetHold() {
    setPanOffset(DEFAULT_PAN_OFFSET);
  }

  function stopHold(event) {
    if (activeHoldPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (viewerStageRef.current?.hasPointerCapture(event.pointerId)) {
      viewerStageRef.current.releasePointerCapture(event.pointerId);
    }

    activeHoldPointerIdRef.current = null;
    holdGestureRef.current = null;
  }

  function handleHoldPointerDown(event) {
    if (event.button !== 0 || !isHoldMode) {
      return;
    }

    event.preventDefault();
    activeHoldPointerIdRef.current = event.pointerId;
    holdGestureRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: panOffset.x,
      startOffsetY: panOffset.y
    };
    viewerStageRef.current?.setPointerCapture(event.pointerId);
  }

  function handleHoldPointerMove(event) {
    if (activeHoldPointerIdRef.current !== event.pointerId || !holdGestureRef.current) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - holdGestureRef.current.startX;
    const deltaY = event.clientY - holdGestureRef.current.startY;
    setPanOffset({
      x: holdGestureRef.current.startOffsetX + deltaX,
      y: holdGestureRef.current.startOffsetY + deltaY
    });
  }

  function toggleHoldMode() {
    setIsHoldMode((current) => !current);
  }

  useEffect(() => {
    setIsHoldMode(false);
    resetHold();
    activeHoldPointerIdRef.current = null;
    holdGestureRef.current = null;
  }, resetDependencies);

  return {
    isHoldMode,
    panOffset,
    isHoldGestureActive: activeHoldPointerIdRef.current !== null,
    toggleHoldMode,
    resetHold,
    handleHoldPointerDown,
    handleHoldPointerMove,
    stopHold
  };
}
