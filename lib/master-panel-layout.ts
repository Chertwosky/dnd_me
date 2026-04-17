export type MasterPanelId =
  | "admin"
  | "tokens"
  | "party"
  | "initiative"
  | "tools";

export type MasterPanelGroup =
  | "scene"
  | "creatures"
  | "combat"
  | "narrative";

export type MasterPanelSize = "compact" | "regular" | "wide" | "full";
export type MasterPanelMobileBehavior = "stack" | "secondary";
export type MasterPanelDesktopPlacement = "primary" | "secondary" | "utility";
export type MasterPanelWidths = Record<MasterPanelId, number>;

export type LegacyMasterPanelLayout = {
  panelOrder?: MasterPanelId[];
  panelWidths?: Partial<MasterPanelWidths>;
};

export type LayoutConfig = {
  version: 2;
  order: MasterPanelId[];
  panels: Record<
    MasterPanelId,
    {
      size: MasterPanelSize;
    }
  >;
};

type MasterPanelDefinition = {
  id: MasterPanelId;
  group: MasterPanelGroup;
  title: string;
  shortLabel: string;
  description: string;
  defaultSize: MasterPanelSize;
  allowedSizes: MasterPanelSize[];
  defaultVisibility: boolean;
  mobileBehavior: MasterPanelMobileBehavior;
  desktopPlacement: MasterPanelDesktopPlacement;
  legacyWidthBounds: {
    min: number;
    max: number;
  };
  legacyWidthThresholds: Partial<Record<MasterPanelSize, number>>;
  spans: Record<
    MasterPanelSize,
    {
      md: number;
      xl: number;
    }
  >;
};

export const MASTER_PANEL_IDS: MasterPanelId[] = [
  "admin",
  "tokens",
  "party",
  "initiative",
  "tools",
];

export const MASTER_PANEL_SIZE_LABELS: Record<MasterPanelSize, string> = {
  compact: "Компактная",
  regular: "Обычная",
  wide: "Широкая",
  full: "Во всю ширину",
};

export const MASTER_PANEL_DEFINITIONS: Record<
  MasterPanelId,
  MasterPanelDefinition
> = {
  admin: {
    id: "admin",
    group: "scene",
    title: "Сцена: админ-панель",
    shortLabel: "Админ",
    description: "Карта, кисти, слои и параметры сцены.",
    defaultSize: "regular",
    allowedSizes: ["compact", "regular"],
    defaultVisibility: true,
    mobileBehavior: "stack",
    desktopPlacement: "primary",
    legacyWidthBounds: {
      min: 320,
      max: 960,
    },
    legacyWidthThresholds: {
      compact: 420,
    },
    spans: {
      compact: { md: 3, xl: 3 },
      regular: { md: 6, xl: 4 },
      wide: { md: 6, xl: 4 },
      full: { md: 6, xl: 4 },
    },
  },
  tokens: {
    id: "tokens",
    group: "creatures",
    title: "Существа: токены",
    shortLabel: "Токены",
    description: "Список существ, быстрые действия и управление токенами.",
    defaultSize: "regular",
    allowedSizes: ["compact", "regular"],
    defaultVisibility: true,
    mobileBehavior: "secondary",
    desktopPlacement: "secondary",
    legacyWidthBounds: {
      min: 320,
      max: 960,
    },
    legacyWidthThresholds: {
      compact: 420,
    },
    spans: {
      compact: { md: 3, xl: 3 },
      regular: { md: 6, xl: 4 },
      wide: { md: 6, xl: 4 },
      full: { md: 6, xl: 4 },
    },
  },
  party: {
    id: "party",
    group: "creatures",
    title: "Существа: персонажи группы",
    shortLabel: "Группа",
    description: "Карточки персонажей, библиотека и управление составом.",
    defaultSize: "wide",
    allowedSizes: ["regular", "wide", "full"],
    defaultVisibility: true,
    mobileBehavior: "stack",
    desktopPlacement: "primary",
    legacyWidthBounds: {
      min: 360,
      max: 1280,
    },
    legacyWidthThresholds: {
      regular: 560,
      wide: 960,
    },
    spans: {
      compact: { md: 6, xl: 4 },
      regular: { md: 6, xl: 4 },
      wide: { md: 6, xl: 8 },
      full: { md: 6, xl: 12 },
    },
  },
  initiative: {
    id: "initiative",
    group: "combat",
    title: "Бой: инициатива",
    shortLabel: "Инициатива",
    description: "Боевой трекер, ход и порядок участников.",
    defaultSize: "wide",
    allowedSizes: ["regular", "wide", "full"],
    defaultVisibility: false,
    mobileBehavior: "stack",
    desktopPlacement: "primary",
    legacyWidthBounds: {
      min: 360,
      max: 1280,
    },
    legacyWidthThresholds: {
      regular: 560,
      wide: 960,
    },
    spans: {
      compact: { md: 6, xl: 4 },
      regular: { md: 6, xl: 4 },
      wide: { md: 6, xl: 8 },
      full: { md: 6, xl: 12 },
    },
  },
  tools: {
    id: "tools",
    group: "narrative",
    title: "Нарратив: инструменты",
    shortLabel: "Инструменты",
    description: "Журнал, лут, события и вспомогательные сервисы мастера.",
    defaultSize: "full",
    allowedSizes: ["regular", "wide", "full"],
    defaultVisibility: true,
    mobileBehavior: "stack",
    desktopPlacement: "utility",
    legacyWidthBounds: {
      min: 320,
      max: 1440,
    },
    legacyWidthThresholds: {
      regular: 520,
      wide: 940,
    },
    spans: {
      compact: { md: 6, xl: 4 },
      regular: { md: 6, xl: 4 },
      wide: { md: 6, xl: 8 },
      full: { md: 6, xl: 12 },
    },
  },
};

export const DEFAULT_MASTER_PANEL_WIDTHS: MasterPanelWidths =
  MASTER_PANEL_IDS.reduce((accumulator, panelId) => {
    const definition = MASTER_PANEL_DEFINITIONS[panelId];
    accumulator[panelId] = definition.legacyWidthBounds.max;
    return accumulator;
  }, {} as MasterPanelWidths);

function clampLegacyPanelWidth(panelId: MasterPanelId, width: number) {
  const { min, max } = MASTER_PANEL_DEFINITIONS[panelId].legacyWidthBounds;
  return Math.max(min, Math.min(max, width));
}

function normalizeMasterPanelSize(
  panelId: MasterPanelId,
  size: MasterPanelSize | undefined,
) {
  const definition = MASTER_PANEL_DEFINITIONS[panelId];
  if (size && definition.allowedSizes.includes(size)) {
    return size;
  }
  return definition.defaultSize;
}

function inferPanelSizeFromLegacyWidth(panelId: MasterPanelId, width: number) {
  const definition = MASTER_PANEL_DEFINITIONS[panelId];
  const normalizedWidth = clampLegacyPanelWidth(panelId, width);
  if (
    definition.allowedSizes.includes("compact") &&
    definition.legacyWidthThresholds.compact !== undefined &&
    normalizedWidth <= definition.legacyWidthThresholds.compact
  ) {
    return "compact" as const;
  }
  if (
    definition.allowedSizes.includes("regular") &&
    definition.legacyWidthThresholds.regular !== undefined &&
    normalizedWidth <= definition.legacyWidthThresholds.regular
  ) {
    return "regular" as const;
  }
  if (
    definition.allowedSizes.includes("wide") &&
    definition.legacyWidthThresholds.wide !== undefined &&
    normalizedWidth <= definition.legacyWidthThresholds.wide
  ) {
    return "wide" as const;
  }
  return definition.allowedSizes.at(-1) ?? definition.defaultSize;
}

export function isMasterPanelId(value: unknown): value is MasterPanelId {
  return (
    typeof value === "string" &&
    MASTER_PANEL_IDS.includes(value as MasterPanelId)
  );
}

export function normalizeMasterPanelOrder(
  input?: MasterPanelId[] | null,
): MasterPanelId[] {
  if (!Array.isArray(input)) return [...MASTER_PANEL_IDS];

  const uniqueKnown = input.filter(
    (panelId, index): panelId is MasterPanelId =>
      isMasterPanelId(panelId) && input.indexOf(panelId) === index,
  );

  for (const panelId of MASTER_PANEL_IDS) {
    if (!uniqueKnown.includes(panelId)) {
      uniqueKnown.push(panelId);
    }
  }

  return uniqueKnown;
}

export function createDefaultLayoutConfig(): LayoutConfig {
  return {
    version: 2,
    order: [...MASTER_PANEL_IDS],
    panels: MASTER_PANEL_IDS.reduce((accumulator, panelId) => {
      accumulator[panelId] = {
        size: MASTER_PANEL_DEFINITIONS[panelId].defaultSize,
      };
      return accumulator;
    }, {} as LayoutConfig["panels"]),
  };
}

export function getMasterPanelDefinition(panelId: MasterPanelId) {
  return MASTER_PANEL_DEFINITIONS[panelId];
}

export function getMasterPanelSizeLabel(size: MasterPanelSize) {
  return MASTER_PANEL_SIZE_LABELS[size];
}

export function getMasterPanelSpanTokens(
  panelId: MasterPanelId,
  size: MasterPanelSize,
) {
  const definition = MASTER_PANEL_DEFINITIONS[panelId];
  return definition.spans[normalizeMasterPanelSize(panelId, size)];
}

export function moveMasterPanel(
  order: MasterPanelId[],
  panelId: MasterPanelId,
  direction: "up" | "down",
) {
  const index = order.indexOf(panelId);
  if (index === -1) return order;
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= order.length) return order;
  const next = [...order];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function normalizeLayoutConfig(
  input?: Partial<LayoutConfig> | null,
): LayoutConfig {
  const defaults = createDefaultLayoutConfig();
  const order = normalizeMasterPanelOrder(input?.order);
  const panels = MASTER_PANEL_IDS.reduce((accumulator, panelId) => {
    accumulator[panelId] = {
      size: normalizeMasterPanelSize(panelId, input?.panels?.[panelId]?.size),
    };
    return accumulator;
  }, {} as LayoutConfig["panels"]);

  return {
    version: 2,
    order,
    panels,
  };
}

export function migrateLegacyLayoutConfig(
  input?: LegacyMasterPanelLayout | null,
): LayoutConfig {
  const defaults = createDefaultLayoutConfig();
  const order = normalizeMasterPanelOrder(input?.panelOrder);
  const panels = MASTER_PANEL_IDS.reduce((accumulator, panelId) => {
    const legacyWidth = input?.panelWidths?.[panelId];
    accumulator[panelId] = {
      size:
        typeof legacyWidth === "number" && Number.isFinite(legacyWidth)
          ? inferPanelSizeFromLegacyWidth(panelId, legacyWidth)
          : defaults.panels[panelId].size,
    };
    return accumulator;
  }, {} as LayoutConfig["panels"]);

  return {
    version: 2,
    order,
    panels,
  };
}

export function normalizeSavedLayoutConfig(
  input?: Partial<LayoutConfig> | LegacyMasterPanelLayout | null,
): LayoutConfig {
  if (!input) return createDefaultLayoutConfig();
  const hasVersion =
    "version" in input &&
    typeof (input as { version?: unknown }).version === "number";
  if ("panels" in input || (hasVersion && input.version === 2)) {
    return normalizeLayoutConfig(input as Partial<LayoutConfig>);
  }
  return migrateLegacyLayoutConfig(input as LegacyMasterPanelLayout);
}
