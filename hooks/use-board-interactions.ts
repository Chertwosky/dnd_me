import { useCallback, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useBoardInteractions({ cols, rows }: { cols: number; rows: number }) {
  const [zoom, setZoom] = useState(1);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  const handleZoomOut = useCallback(
    () => setZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.2, 1.8)),
    [],
  );

  const handleZoomIn = useCallback(
    () => setZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.2, 1.8)),
    [],
  );

  const handleZoomFit = useCallback(() => {
    const fitByWidth = 1200 / (cols * 44);
    const fitByHeight = 700 / (rows * 44);
    setZoom(clamp(Math.min(fitByWidth, fitByHeight), 0.2, 1.8));
  }, [cols, rows]);

  return {
    zoom,
    setZoom,
    isPointerDown,
    setIsPointerDown,
    draggingTokenId,
    setDraggingTokenId,
    handleZoomOut,
    handleZoomIn,
    handleZoomFit,
  };
}
