import { useEffect, useRef, useState } from "react";

const DEFAULT_ORIGIN = { x: 50, y: 50 };

export function useViewerZoom(resetDependencies = []) {
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const activeZoomPointerIdRef = useRef(null);
  const zoomGestureRef = useRef(null);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState(DEFAULT_ORIGIN);

  function resetZoom() {
    setZoomScale(1);
    setZoomOrigin(DEFAULT_ORIGIN);
  }

  function stopViewerZoom(event) {
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

  function handleViewerPointerDown(event) {
    if (!isZoomMode || event.button !== 0) {
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

  function handleViewerPointerMove(event) {
    if (!isZoomMode || activeZoomPointerIdRef.current !== event.pointerId || !zoomGestureRef.current) {
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
    viewerStageRef,
    previewImageRef,
    isZoomMode,
    zoomScale,
    zoomOrigin,
    isZoomGestureActive: activeZoomPointerIdRef.current !== null,
    toggleZoomMode,
    resetZoom,
    handleViewerPointerDown,
    handleViewerPointerMove,
    stopViewerZoom
  };
}
