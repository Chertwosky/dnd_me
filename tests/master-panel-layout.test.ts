import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultLayoutConfig,
  getMasterPanelSpanTokens,
  moveMasterPanel,
  normalizeLayoutConfig,
  normalizeMasterPanelOrder,
  normalizeSavedLayoutConfig,
} from "../lib/master-panel-layout.ts";

test("creates default layout config with stable order and panel sizes", () => {
  const layout = createDefaultLayoutConfig();

  assert.equal(layout.version, 2);
  assert.deepEqual(layout.order, [
    "admin",
    "tokens",
    "party",
    "initiative",
    "tools",
  ]);
  assert.equal(layout.panels.admin.size, "regular");
  assert.equal(layout.panels.tokens.size, "regular");
  assert.equal(layout.panels.party.size, "wide");
  assert.equal(layout.panels.initiative.size, "wide");
  assert.equal(layout.panels.tools.size, "full");
});

test("normalizes layout config and restores invalid or missing panel sizes", () => {
  const normalized = normalizeLayoutConfig({
    order: ["tools", "party", "tools"],
    panels: {
      admin: { size: "compact" },
      tokens: { size: "compact" },
      party: { size: "compact" as never },
      initiative: { size: "regular" },
      tools: { size: "full" },
    },
  });

  assert.deepEqual(normalized.order, [
    "tools",
    "party",
    "admin",
    "tokens",
    "initiative",
  ]);
  assert.equal(normalized.panels.admin.size, "compact");
  assert.equal(normalized.panels.tokens.size, "compact");
  assert.equal(normalized.panels.party.size, "wide");
  assert.equal(normalized.panels.initiative.size, "regular");
  assert.equal(normalized.panels.tools.size, "full");
});

test("normalizes panel order, removes duplicates and restores missing panels", () => {
  const normalized = normalizeMasterPanelOrder([
    "tools",
    "party",
    "tools",
    "initiative",
  ]);

  assert.deepEqual(normalized, [
    "tools",
    "party",
    "initiative",
    "admin",
    "tokens",
  ]);
});

test("migrates legacy width-based layout into explicit panel sizes", () => {
  const migrated = normalizeSavedLayoutConfig({
    panelOrder: ["tools", "initiative", "party"],
    panelWidths: {
      admin: 320,
      tokens: 360,
      party: 700,
      initiative: 1100,
      tools: 600,
    },
  });

  assert.deepEqual(migrated.order, [
    "tools",
    "initiative",
    "party",
    "admin",
    "tokens",
  ]);
  assert.equal(migrated.panels.admin.size, "compact");
  assert.equal(migrated.panels.tokens.size, "compact");
  assert.equal(migrated.panels.party.size, "wide");
  assert.equal(migrated.panels.initiative.size, "full");
  assert.equal(migrated.panels.tools.size, "wide");
});

test("computes responsive spans from explicit panel sizes", () => {
  assert.deepEqual(getMasterPanelSpanTokens("admin", "compact"), {
    md: 3,
    xl: 3,
  });
  assert.deepEqual(getMasterPanelSpanTokens("party", "wide"), {
    md: 6,
    xl: 8,
  });
  assert.deepEqual(getMasterPanelSpanTokens("tools", "full"), {
    md: 6,
    xl: 12,
  });
});

test("moves panels inside order without mutating impossible positions", () => {
  assert.deepEqual(
    moveMasterPanel(["admin", "tokens", "party"], "tokens", "up"),
    ["tokens", "admin", "party"],
  );
  assert.deepEqual(
    moveMasterPanel(["admin", "tokens", "party"], "admin", "up"),
    ["admin", "tokens", "party"],
  );
});
