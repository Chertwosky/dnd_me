"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  createCell,
  getCellIndex,
  getStampStyle,
  getTerrainBackground,
  getTextureOverlay,
  type CellData,
} from "@/lib/room/board-render";
import { getStatusMeta } from "@/lib/room/token-status";

const VIEWPORT_BUFFER = 2;

export type BoardToken = {
  id: string;
  name: string;
  short: string;
  color: string;
  x: number;
  y: number;
  statuses?: string[];
};

export function TacticalBoard({
  boardId,
  title,
  subtitle,
  cols,
  rows,
  tiles,
  tokens,
  zoom,
  showZoomOverlay,
  onZoomOut,
  onZoomIn,
  onZoomChange,
  onZoomFit,
  onReturnToMain,
  showReturnToMain,
  visibleMask,
  onBoardPointerDown,
  onTokenPointerDown,
  activeTokenId,
  reduceMotion = false,
}: {
  boardId: string;
  title: string;
  subtitle: string;
  cols: number;
  rows: number;
  tiles: CellData[];
  tokens: BoardToken[];
  zoom: number;
  showZoomOverlay?: boolean;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  onZoomChange?: (value: number) => void;
  onZoomFit?: () => void;
  onReturnToMain?: () => void;
  showReturnToMain?: boolean;
  visibleMask?: boolean[];
  onBoardPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTokenPointerDown?: (
    tokenId: string,
  ) => (event: ReactPointerEvent<HTMLButtonElement>) => void;
  activeTokenId?: string | null;
  reduceMotion?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const aspectRatio = `${cols} / ${rows}`;
  const minWidth = Math.max(600, cols * 44);
  const cellSize = minWidth / cols;

  const [viewport, setViewport] = useState({
    colStart: 0,
    colEnd: cols - 1,
    rowStart: 0,
    rowEnd: rows - 1,
  });

  const updateViewport = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const colStart = Math.max(
      0,
      Math.floor(scroller.scrollLeft / cellSize) - VIEWPORT_BUFFER,
    );
    const colEnd = Math.min(
      cols - 1,
      Math.ceil((scroller.scrollLeft + scroller.clientWidth) / cellSize) +
        VIEWPORT_BUFFER,
    );
    const rowStart = Math.max(
      0,
      Math.floor(scroller.scrollTop / cellSize) - VIEWPORT_BUFFER,
    );
    const rowEnd = Math.min(
      rows - 1,
      Math.ceil((scroller.scrollTop + scroller.clientHeight) / cellSize) +
        VIEWPORT_BUFFER,
    );

    setViewport((current) =>
      current.colStart === colStart &&
      current.colEnd === colEnd &&
      current.rowStart === rowStart &&
      current.rowEnd === rowEnd
        ? current
        : { colStart, colEnd, rowStart, rowEnd },
    );
  }, [cellSize, cols, rows]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    updateViewport();
    const onScroll = () => {
      window.requestAnimationFrame(updateViewport);
    };
    const onScrollEnd = () => updateViewport();

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", updateViewport);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", updateViewport);
    };
  }, [updateViewport]);

  useEffect(() => {
    updateViewport();
  }, [cols, rows, zoom, updateViewport]);

  const visibleCells = useMemo(() => {
    const cells: Array<{ index: number; x: number; y: number }> = [];
    for (let y = viewport.rowStart; y <= viewport.rowEnd; y += 1) {
      for (let x = viewport.colStart; x <= viewport.colEnd; x += 1) {
        const index = getCellIndex(x, y, cols);
        cells.push({ index, x, y });
      }
    }
    return cells;
  }, [cols, viewport.colEnd, viewport.colStart, viewport.rowEnd, viewport.rowStart]);

  const gridTransform = reduceMotion
    ? undefined
    : { transform: `scale(${zoom})`, transformOrigin: "top left" as const };

  return (
    <div className="arcane-panel p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <div className="eyebrow">Тактическая карта</div>
          <h2 className="mt-1 text-lg font-semibold text-parchment-100">{title}</h2>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
        <span className="badge border-rune-400/30 bg-rune-500/10 text-rune-100">
          {cols}×{rows}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="tactical-board-scroller overflow-auto rounded-3xl border border-white/10 bg-ink-950/80 p-3 shadow-inner"
      >
        <div className="relative">
          {showZoomOverlay ? (
            <div className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded-2xl border border-white/15 bg-ink-950/90 px-2 py-2 shadow-rune-glow backdrop-blur">
              <button
                type="button"
                onClick={onZoomOut}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-100 transition hover:border-rune-400/50"
              >
                −
              </button>
              <input
                type="range"
                min="20"
                max="180"
                value={Math.round(zoom * 100)}
                onChange={(event) =>
                  onZoomChange?.(Number(event.target.value) / 100)
                }
                className="w-24"
              />
              <button
                type="button"
                onClick={onZoomIn}
                className="rounded-lg border border-white/15 px-2 py-1 text-xs text-slate-100 transition hover:border-rune-400/50"
              >
                +
              </button>
              <button
                type="button"
                onClick={onZoomFit}
                className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-200 transition hover:border-rune-400/50"
              >
                fit
              </button>
              {showReturnToMain ? (
                <button
                  type="button"
                  onClick={onReturnToMain}
                  className="rounded-lg border border-emerald-300/30 px-2 py-1 text-[11px] text-emerald-200 transition hover:border-emerald-300/70"
                >
                  main
                </button>
              ) : null}
            </div>
          ) : null}
          <div
            id={boardId}
            onPointerDown={onBoardPointerDown}
            className="tactical-board-grid relative touch-none select-none overflow-hidden rounded-3xl border border-white/10 bg-slate-900"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              ...gridTransform,
              aspectRatio,
              minWidth,
            }}
          >
            {visibleCells.map(({ index, x, y }) => {
              const cell = tiles[index] ?? createCell();
              const isVisible = visibleMask ? visibleMask[index] : true;
              const textureOverlay = getTextureOverlay(cell);
              return (
                <div
                  key={`${title}-${x}-${y}`}
                  className="relative"
                  style={{
                    ...getTerrainBackground(cell),
                    gridColumn: x + 1,
                    gridRow: y + 1,
                  }}
                >
                  {textureOverlay ? (
                    <div
                      className="absolute inset-0 opacity-55"
                      style={{
                        ...textureOverlay,
                        backgroundPosition: `${x * 10}px ${y * 10}px`,
                      }}
                    />
                  ) : null}
                  {cell.obstacle ? (
                    <div
                      className="absolute flex items-center justify-center rounded-md border-2 opacity-90"
                      style={{
                        ...getStampStyle(cell.obstacleScale, cell.obstacleAnchor),
                        borderColor: cell.obstacle,
                        backgroundColor: `${cell.obstacle}4D`,
                        boxShadow: `inset 0 0 0 1px ${cell.obstacle}AA`,
                      }}
                    >
                      {cell.obstaclePreset === "door" ? (
                        <span className="text-[10px] font-black text-amber-100">
                          🚪
                        </span>
                      ) : cell.obstaclePreset === "column" ? (
                        <span className="text-[10px] font-black text-slate-100">
                          ◉
                        </span>
                      ) : cell.obstaclePreset === "light" ? (
                        <span className="text-[10px] font-black text-yellow-100">
                          ✦
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {cell.furniture ? (
                    <div
                      className="absolute flex items-center justify-center rounded-sm"
                      style={{
                        ...getStampStyle(
                          cell.furnitureScale,
                          cell.furnitureAnchor,
                        ),
                        backgroundColor: cell.furniture,
                        backgroundImage:
                          cell.furniturePreset === "stage"
                            ? cell.furnitureVariant === "stone"
                              ? "linear-gradient(180deg, rgba(226,232,240,0.6), rgba(71,85,105,0.45))"
                              : cell.furnitureVariant === "velvet"
                                ? "repeating-linear-gradient(90deg, rgba(244,114,182,0.6) 0 3px, rgba(131,24,67,0.5) 3px 6px)"
                                : "repeating-linear-gradient(90deg, rgba(245,158,11,0.45) 0 4px, rgba(120,53,15,0.45) 4px 8px)"
                            : "linear-gradient(120deg, rgba(255,255,255,0.2), rgba(15,23,42,0.22))",
                      }}
                    >
                      {cell.furniturePreset === "table" ? "▭" : null}
                      {cell.furniturePreset === "chair" ? "◍" : null}
                      {cell.furniturePreset === "stage" ? "▤" : null}
                      {cell.furniturePreset === "crate" ? "▣" : null}
                      {cell.furniturePreset === "altar" ? "✢" : null}
                    </div>
                  ) : null}
                  {cell.fog ? (
                    <div className="absolute inset-0 bg-slate-950/70" />
                  ) : null}
                  {!isVisible ? (
                    <div className="absolute inset-0 bg-black" />
                  ) : null}
                </div>
              );
            })}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)",
                backgroundSize: `${100 / cols}% ${100 / rows}%`,
              }}
            />

            {tokens.map((token) => {
              const left = `${((token.x + 0.5) / cols) * 100}%`;
              const top = `${((token.y + 0.5) / rows) * 100}%`;
              const isActive = activeTokenId === token.id;
              const visibleStatuses = (token.statuses ?? [])
                .slice(0, 2)
                .flatMap((status) => {
                  const meta = getStatusMeta(
                    status as Parameters<typeof getStatusMeta>[0],
                  );
                  return meta ? [meta] : [];
                });
              const extraStatusCount = Math.max(
                (token.statuses ?? []).length - visibleStatuses.length,
                0,
              );
              const style: CSSProperties = {
                left,
                top,
                transform: reduceMotion
                  ? "translate(-50%, -50%)"
                  : `translate(-50%, -50%) scale(${1 / zoom})`,
                transformOrigin: "center",
                borderColor: token.color,
                backgroundColor: `${token.color}33`,
                boxShadow: isActive
                  ? `0 0 0 3px rgba(250, 204, 21, 0.9), 0 0 30px ${token.color}88`
                  : `0 0 24px ${token.color}55`,
              };
              const isHiddenByMask = visibleMask
                ? !visibleMask[getCellIndex(token.x, token.y, cols)]
                : false;
              if (isHiddenByMask) return null;
              return (
                <button
                  key={token.id}
                  type="button"
                  onPointerDown={
                    onTokenPointerDown
                      ? onTokenPointerDown(token.id)
                      : undefined
                  }
                  className="absolute flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold text-white shadow-lg transition"
                  style={style}
                  title={
                    (token.statuses ?? []).length
                      ? `${token.name}: ${(token.statuses ?? [])
                          .map(
                            (status) =>
                              getStatusMeta(
                                status as Parameters<typeof getStatusMeta>[0],
                              )?.label ?? status,
                          )
                          .join(", ")}`
                      : token.name
                  }
                >
                  {token.short}
                  {visibleStatuses.length ? (
                    <span className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-1">
                      {visibleStatuses.map((status) => (
                        <span
                          key={`${token.id}-${status.key}`}
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${status.colorClass}`}
                        >
                          {status.short}
                        </span>
                      ))}
                      {extraStatusCount ? (
                        <span className="rounded-full border border-white/10 bg-slate-950/90 px-1.5 py-0.5 text-[9px] font-bold leading-none text-slate-200">
                          +{extraStatusCount}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
