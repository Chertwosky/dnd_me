import type { CSSProperties } from "react";

export type CellData = {
  terrain: string;
  terrainPreset?: "stone" | "wood" | "water" | "earth" | "grass";
  obstacle: string | null;
  obstacleScale?: "full" | "half" | "quarter";
  obstacleAnchor?: "center" | "tl" | "tr" | "bl" | "br";
  obstaclePreset?: "stone-wall" | "wood-wall" | "door" | "column" | "light";
  texture: string | null;
  texturePreset?: "moss" | "rubble" | "sand" | "blood" | "tiles";
  furniture: string | null;
  furnitureScale?: "full" | "half" | "quarter";
  furnitureAnchor?: "center" | "tl" | "tr" | "bl" | "br";
  furniturePreset?: "table" | "chair" | "stage" | "crate" | "altar";
  furnitureVariant?: "wood" | "stone" | "velvet";
  fog: boolean;
};

const DEFAULT_TERRAIN = "#0f172a";

export function createCell(): CellData {
  return {
    terrain: DEFAULT_TERRAIN,
    terrainPreset: "stone",
    obstacle: null,
    obstacleScale: "full",
    obstacleAnchor: "center",
    obstaclePreset: undefined,
    texture: null,
    texturePreset: undefined,
    furniture: null,
    furnitureScale: "full",
    furnitureAnchor: "center",
    furniturePreset: undefined,
    furnitureVariant: "wood",
    fog: false,
  };
}

export function getCellIndex(x: number, y: number, cols: number) {
  return y * cols + x;
}

export function getStampStyle(
  scale: "full" | "half" | "quarter" = "full",
  anchor: "center" | "tl" | "tr" | "bl" | "br" = "center",
): CSSProperties {
  if (scale === "full") return { inset: "12%" };

  const size = scale === "half" ? "50%" : "25%";
  if (anchor === "center") {
    return {
      width: size,
      height: size,
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
    };
  }

  const inset = "14%";
  const style: CSSProperties = { width: size, height: size };
  if (anchor.includes("t")) style.top = inset;
  if (anchor.includes("b")) style.bottom = inset;
  if (anchor.includes("l")) style.left = inset;
  if (anchor.includes("r")) style.right = inset;
  return style;
}

export function getTerrainBackground(cell: CellData): CSSProperties {
  const preset = cell.terrainPreset;
  if (preset === "water") {
    return {
      backgroundColor: "#1d4ed8",
      backgroundImage:
        "repeating-radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0 5px, transparent 5px 13px)",
    };
  }
  if (preset === "wood") {
    return {
      backgroundColor: "#92400e",
      backgroundImage:
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.1) 0 3px, rgba(0,0,0,0.08) 3px 10px)",
    };
  }
  if (preset === "earth") {
    return {
      backgroundColor: "#7c2d12",
      backgroundImage:
        "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.1), transparent 40%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.2), transparent 45%)",
    };
  }
  if (preset === "grass") {
    return {
      backgroundColor: "#166534",
      backgroundImage:
        "repeating-linear-gradient(65deg, rgba(255,255,255,0.1) 0 1px, transparent 1px 6px)",
    };
  }
  return {
    backgroundColor: cell.terrain,
    backgroundImage:
      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.09), transparent 35%), radial-gradient(circle at 80% 70%, rgba(15,23,42,0.24), transparent 42%)",
  };
}

export function getTextureOverlay(cell: CellData): CSSProperties | null {
  if (!cell.texture && !cell.texturePreset) return null;
  if (cell.texturePreset === "moss") {
    return {
      backgroundImage:
        "radial-gradient(circle, rgba(34,197,94,0.35) 0 30%, transparent 35%)",
      backgroundSize: "12px 12px",
    };
  }
  if (cell.texturePreset === "rubble") {
    return {
      backgroundImage:
        "repeating-linear-gradient(130deg, rgba(161,161,170,0.5) 0 2px, transparent 2px 8px)",
    };
  }
  if (cell.texturePreset === "sand") {
    return {
      backgroundImage:
        "radial-gradient(circle, rgba(250,204,21,0.35) 0 20%, transparent 24%)",
      backgroundSize: "8px 8px",
    };
  }
  if (cell.texturePreset === "blood") {
    return {
      backgroundImage:
        "radial-gradient(circle at 35% 40%, rgba(220,38,38,0.6), transparent 36%), radial-gradient(circle at 65% 65%, rgba(153,27,27,0.5), transparent 30%)",
    };
  }
  if (cell.texturePreset === "tiles") {
    return {
      backgroundImage:
        "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
    };
  }
  return {
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent 0 7px, currentColor 7px 9px)",
    color: cell.texture ?? "#22c55e",
    mixBlendMode: "screen",
  };
}

export function createEmptyMap(cols: number, rows: number) {
  return Array.from({ length: cols * rows }, createCell);
}
