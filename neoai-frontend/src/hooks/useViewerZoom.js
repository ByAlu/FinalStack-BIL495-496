import { useEffect, useRef, useState } from "react";

const DEFAULT_ORIGIN = { x: 50, y: 50 };
const DEFAULT_PAN_OFFSET = { x: 0, y: 0 };

export function useViewerZoom(resetDependencies = []) {
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const activeZoomPointerIdRef = useRef(null);
  const zoomGestureRef = useRef(null);
  const activePanPointerIdRef = useRef(null);
  const panGestureRef = useRef(null);
  const [isHoldMode, setIsHoldMode] = useState(false);
  const [isZoomMode, setIsZoomMode] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState(DEFAULT_ORIGIN);
  const [panOffset, setPanOffset] = useState(DEFAULT_PAN_OFFSET);

  function resetZoom() {
    setZoomScale(1);
    setZoomOrigin(DEFAULT_ORIGIN);
    setPanOffset(DEFAULT_PAN_OFFSET);
  }

  function stopViewerZoom(event) {
    if (activeZoomPointerIdRef.current === event.pointerId) {
      if (viewerStageRef.current?.hasPointerCapture(event.pointerId)) {
        viewerStageRef.current.releasePointerCapture(event.pointerId);
      }

      activeZoomPointerIdRef.current = null;
      zoomGestureRef.current = null;
    }

    if (activePanPointerIdRef.current === event.pointerId) {
      if (viewerStageRef.current?.hasPointerCapture(event.pointerId)) {
        viewerStageRef.current.releasePointerCapture(event.pointerId);
      }

      activePanPointerIdRef.current = null;
      panGestureRef.current = null;
    }
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
    if (event.button !== 0) {
      return;
    }

    if (isHoldMode) {
      event.preventDefault();
      activePanPointerIdRef.current = event.pointerId;
      panGestureRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startOffsetX: panOffset.x,
        startOffsetY: panOffset.y
      };
      viewerStageRef.current?.setPointerCapture(event.pointerId);
      return;
    }

    if (isZoomMode) {
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
  }

  function handleViewerPointerMove(event) {
    if (isHoldMode && activePanPointerIdRef.current === event.pointerId && panGestureRef.current) {
      event.preventDefault();
      const deltaX = event.clientX - panGestureRef.current.startX;
      const deltaY = event.clientY - panGestureRef.current.startY;
      setPanOffset({
        x: panGestureRef.current.startOffsetX + deltaX,
        y: panGestureRef.current.startOffsetY + deltaY
      });
      return;
    }

    if (isZoomMode && activeZoomPointerIdRef.current === event.pointerId && zoomGestureRef.current) {
      event.preventDefault();
      const deltaY = zoomGestureRef.current.startY - event.clientY;
      const nextScale = Math.max(1, Math.min(5, zoomGestureRef.current.startScale + deltaY * 0.01));
      setZoomScale(nextScale);
    }
  }

  function toggleZoomMode() {
    setIsZoomMode((current) => {
      const next = !current;
      if (next) {
        setIsHoldMode(false);
      }
      return next;
    });
  }

  function toggleHoldMode() {
    setIsHoldMode((current) => {
      const next = !current;
      if (next) {
        setIsZoomMode(false);
      }
      return next;
    });
  }

  useEffect(() => {
    setIsZoomMode(false);
    setIsHoldMode(false);
    resetZoom();
    activeZoomPointerIdRef.current = null;
    zoomGestureRef.current = null;
    activePanPointerIdRef.current = null;
    panGestureRef.current = null;
  }, resetDependencies);

  return {
    viewerStageRef,
    previewImageRef,
    isHoldMode,
    isZoomMode,
    zoomScale,
    zoomOrigin,
    panOffset,
    isHoldGestureActive: activePanPointerIdRef.current !== null,
    isZoomGestureActive: activeZoomPointerIdRef.current !== null,
    toggleHoldMode,
    toggleZoomMode,
    resetZoom,
    handleViewerPointerDown,
    handleViewerPointerMove,
    stopViewerZoom
  };
}
