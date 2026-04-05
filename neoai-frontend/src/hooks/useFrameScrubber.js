import { useRef } from "react";

export function useFrameScrubber({ activeVideoFramesLength, onSeekFrame }) {
  const scrubberRailRef = useRef(null);
  const activeScrubberPointerIdRef = useRef(null);
  const isDraggingScrubberRef = useRef(false);

  function updateFrameFromRail(clientY) {
    if (!scrubberRailRef.current) {
      return;
    }

    const rect = scrubberRailRef.current.getBoundingClientRect();
    const relativeY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const ratio = rect.height <= 0 ? 0 : relativeY / rect.height;
    onSeekFrame(Math.round(ratio * Math.max(activeVideoFramesLength - 1, 0)));
  }

  function handleRailMouseDown(event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    isDraggingScrubberRef.current = true;
    activeScrubberPointerIdRef.current = event.pointerId;
    scrubberRailRef.current?.setPointerCapture(event.pointerId);
  }

  function handleRailPointerMove(event) {
    if (!isDraggingScrubberRef.current || activeScrubberPointerIdRef.current !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    updateFrameFromRail(event.clientY);
  }

  function stopRailDrag(event) {
    if (activeScrubberPointerIdRef.current !== event.pointerId) {
      return;
    }

    event.stopPropagation();

    if (scrubberRailRef.current?.hasPointerCapture(event.pointerId)) {
      scrubberRailRef.current.releasePointerCapture(event.pointerId);
    }

    isDraggingScrubberRef.current = false;
    activeScrubberPointerIdRef.current = null;
  }

  return {
    scrubberRailRef,
    handleRailMouseDown,
    handleRailPointerMove,
    stopRailDrag,
    getScrubberThumbTop(currentFrame) {
      return activeVideoFramesLength <= 1 ? 0 : (currentFrame / (activeVideoFramesLength - 1)) * 100;
    }
  };
}
