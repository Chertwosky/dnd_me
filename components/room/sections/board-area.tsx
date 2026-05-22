"use client";

import type { PointerEvent as ReactPointerEvent } from "react";

import { TacticalBoard } from "@/components/room/board/tactical-board";
import type { CellData } from "@/lib/room/board-render";

type MapState = {
  cols: number;
  rows: number;
  publicTiles: CellData[];
  gmTiles: CellData[];
};

type SavedMapPreset = {
  id: string;
  name: string;
  mapName: string;
  mapState: MapState;
};

type BoardToken = {
  id: string;
  name: string;
  short: string;
  color: string;
  x: number;
  y: number;
  statuses?: string[];
};

export function RoomBoardArea({
  role,
  cols,
  rows,
  playerTiles,
  gmTiles,
  visibleTokensForPlayers,
  tokensOnCurrentMap,
  playerVisibilityMask,
  zoom,
  prefersReducedMotion,
  savedMaps,
  activeSavedMapId,
  quickMapTabName,
  quickTabAsToken,
  onQuickMapTabNameChange,
  onQuickTabAsTokenChange,
  onReturnToMainMap,
  onLoadSavedMap,
  onSetCurrentAsMainMap,
  onQuickCreateMapTab,
  onFocusPlayerToken,
  playerTokens,
  boardButtonClass,
  handleZoomOut,
  handleZoomIn,
  setZoom,
  handleZoomFit,
  handleReturnToMainMap,
  handleBoardPointerDown,
  handleTokenPointerDown,
  activeInitiativeTokenId,
}: {
  role: "gm" | "player" | "spectator" | null;
  cols: number;
  rows: number;
  playerTiles: CellData[];
  gmTiles: CellData[];
  visibleTokensForPlayers: BoardToken[];
  tokensOnCurrentMap: BoardToken[];
  playerVisibilityMask: boolean[];
  zoom: number;
  prefersReducedMotion: boolean;
  savedMaps: SavedMapPreset[];
  activeSavedMapId: string | null;
  quickMapTabName: string;
  quickTabAsToken: boolean;
  onQuickMapTabNameChange: (value: string) => void;
  onQuickTabAsTokenChange: (value: boolean) => void;
  onReturnToMainMap: () => void;
  onLoadSavedMap: (preset: SavedMapPreset) => void;
  onSetCurrentAsMainMap: () => void;
  onQuickCreateMapTab: () => void;
  onFocusPlayerToken: (tokenId: string) => void;
  playerTokens: Array<{ id: string; name: string; mapId?: string }>;
  boardButtonClass: (isActive: boolean) => string;
  handleZoomOut: () => void;
  handleZoomIn: () => void;
  setZoom: (value: number) => void;
  handleZoomFit: () => void;
  handleReturnToMainMap: () => void;
  handleBoardPointerDown: (
    board: "public" | "gm",
  ) => (event: React.PointerEvent<HTMLDivElement>) => void;
  handleTokenPointerDown: (
    tokenId: string,
  ) => (event: React.PointerEvent<HTMLButtonElement>) => void;
  activeInitiativeTokenId?: string | null;
}) {
  return (
    <section className="space-y-4">
      {role === "gm" ? (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={onReturnToMainMap}
              className={boardButtonClass(activeSavedMapId === null)}
            >
              Основная
            </button>
            {savedMaps.map((preset) => (
              <button
                key={`map-tab-${preset.id}`}
                type="button"
                onClick={() => onLoadSavedMap(preset)}
                className={boardButtonClass(activeSavedMapId === preset.id)}
              >
                {preset.name}
              </button>
            ))}
            <button
              type="button"
              onClick={onSetCurrentAsMainMap}
              className="ml-auto rounded-full border border-emerald-400/40 px-3 py-2 text-xs text-emerald-200"
            >
              Сделать текущую основной
            </button>
            <input
              value={quickMapTabName}
              onChange={(event) => onQuickMapTabNameChange(event.target.value)}
              placeholder="Новая вкладка"
              className="min-w-[11rem] rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-white"
            />
            <label className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={quickTabAsToken}
                onChange={(event) => onQuickTabAsTokenChange(event.target.checked)}
              />
              как токен-переход
            </label>
            <button
              type="button"
              onClick={onQuickCreateMapTab}
              className="rounded-full border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200"
            >
              + вкладка
            </button>
          </div>
          <div className="card flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
            <span className="text-slate-400">Игроки по картам:</span>
            {playerTokens.map((token) => (
              <button
                key={`player-jump-${token.id}`}
                type="button"
                onClick={() => onFocusPlayerToken(token.id)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-slate-200"
              >
                {token.name} →{" "}
                {(token.mapId ?? "main") === "main"
                  ? "Основная"
                  : (savedMaps.find((preset) => preset.id === token.mapId)?.name ??
                    "Сцена")}
              </button>
            ))}
          </div>
          <div id="battle-board-public">
            <TacticalBoard
              boardId="battle-grid-public"
              title="Публичная карта"
              subtitle="Превью того, что увидят игроки: туман войны, радиус обзора и скрытность."
              cols={cols}
              rows={rows}
              tiles={playerTiles}
              tokens={visibleTokensForPlayers}
              visibleMask={playerVisibilityMask}
              zoom={zoom}
              showZoomOverlay
              onZoomOut={handleZoomOut}
              onZoomIn={handleZoomIn}
              onZoomChange={setZoom}
              onZoomFit={handleZoomFit}
              onReturnToMain={handleReturnToMainMap}
              showReturnToMain={activeSavedMapId !== null}
              onBoardPointerDown={handleBoardPointerDown("public")}
              onTokenPointerDown={handleTokenPointerDown}
              activeTokenId={activeInitiativeTokenId}
              reduceMotion={prefersReducedMotion}
            />
          </div>
          <div id="battle-board-gm">
            <TacticalBoard
              boardId="battle-grid-gm"
              title="Скрытая карта мастера"
              subtitle="Здесь мастер держит НПС, ловушки, тайники и будущие сцены до их открытия игрокам."
              cols={cols}
              rows={rows}
              tiles={gmTiles}
              tokens={tokensOnCurrentMap}
              zoom={zoom}
              showZoomOverlay
              onZoomOut={handleZoomOut}
              onZoomIn={handleZoomIn}
              onZoomChange={setZoom}
              onZoomFit={handleZoomFit}
              onReturnToMain={handleReturnToMainMap}
              showReturnToMain={activeSavedMapId !== null}
              onBoardPointerDown={handleBoardPointerDown("gm")}
              onTokenPointerDown={handleTokenPointerDown}
              activeTokenId={activeInitiativeTokenId}
              reduceMotion={prefersReducedMotion}
            />
          </div>
        </div>
      ) : (
        <div id="battle-board-public">
          <TacticalBoard
            boardId="battle-grid-public"
            title="Игровое поле"
            subtitle="Игрок видит карту с учётом fog of war, обзора и скрытых токенов."
            cols={cols}
            rows={rows}
            tiles={playerTiles}
            tokens={visibleTokensForPlayers}
            visibleMask={playerVisibilityMask}
            zoom={zoom}
            showZoomOverlay
            onZoomOut={handleZoomOut}
            onZoomIn={handleZoomIn}
            onZoomChange={setZoom}
            onZoomFit={handleZoomFit}
            onReturnToMain={handleReturnToMainMap}
            showReturnToMain={activeSavedMapId !== null}
            onBoardPointerDown={handleBoardPointerDown("public")}
            onTokenPointerDown={handleTokenPointerDown}
            activeTokenId={activeInitiativeTokenId}
            reduceMotion={prefersReducedMotion}
          />
        </div>
      )}
    </section>
  );
}
