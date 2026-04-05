import { useEffect, useRef, useState } from "react";

const DEFAULT_ORIGIN = { x: 50, y: 50 };

export function useViewerZoom({ viewerStageRef, previewImageRef, resetDependencies = [] }) {
  const activeZoomPointerIdRef = useRef(null);
  const zoomGestureRef = useRef(null);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState(DEFAULT_ORIGIN);

  function resetZoom() {
    setZoomScale(1);
    setZoomOrigin(DEFAULT_ORIGIN);
  }

  function stopZoom(event) {
    if (activeZoomPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (viewerStageRef.current?.hasPointerCapture(event.pointerId)) {
      viewerStageRef.current.releasePointerCapture(event.pointerId);
    }

    activeZoomPointerIdRef.current = null;
    zoomGestureRef.current = null;
  }

  function getZoomOriginFromPointer(clientX, clientY) {
    if (!previewImageRef.current) {
      return null;
    }

    const rect = previewImageRef.current.getBoundingClientRect();

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }

    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  }

  function handleZoomPointerDown(event) {
    if (event.button !== 0 || !isZoomMode) {
      return;
    }

    const nextOrigin = getZoomOriginFromPointer(event.clientX, event.clientY);

    if (!nextOrigin) {
      return;
    }

    event.preventDefault();
    activeZoomPointerIdRef.current = event.pointerId;
    zoomGestureRef.current = {
      startY: event.clientY,
      startScale: zoomScale
    };
    setZoomOrigin(nextOrigin);
    viewerStageRef.current?.setPointerCapture(event.pointerId);
  }

  function handleZoomPointerMove(event) {
    if (activeZoomPointerIdRef.current !== event.pointerId || !zoomGestureRef.current) {
      return;
    }

    event.preventDefault();
    const deltaY = zoomGestureRef.current.startY - event.clientY;
    const nextScale = Math.max(1, Math.min(5, zoomGestureRef.current.startScale + deltaY * 0.01));
    setZoomScale(nextScale);
  }

  function toggleZoomMode() {
    setIsZoomMode((current) => !current);
  }

  useEffect(() => {
    setIsZoomMode(false);
    resetZoom();
    activeZoomPointerIdRef.current = null;
    zoomGestureRef.current = null;
  }, resetDependencies);

  return {
    isZoomMode,
    zoomScale,
    zoomOrigin,
    isZoomGestureActive: activeZoomPointerIdRef.current !== null,
    toggleZoomMode,
    resetZoom,
    handleZoomPointerDown,
    handleZoomPointerMove,
    stopZoom
  };
}
