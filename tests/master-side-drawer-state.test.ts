import test from "node:test";
import assert from "node:assert/strict";

import {
  DRAWER_WIDTH_MAX_DESKTOP,
  DRAWER_WIDTH_MAX_MOBILE,
  DRAWER_WIDTH_MAX_TABLET,
  DRAWER_WIDTH_MIN,
  clampDrawerWidth,
  closeDrawer,
  getDrawerRangeMax,
  isDrawerCompact,
  isDrawerUltraCompact,
  shouldClampDrawerWidth,
  toggleDrawerOpen,
} from "../lib/master-side-drawer-state.ts";

test("drawer state helpers toggle and close deterministically", () => {
  assert.equal(toggleDrawerOpen(true), false);
  assert.equal(toggleDrawerOpen(false), true);
  assert.equal(closeDrawer(), false);
});

test("drawer compact and ultra-compact thresholds are strict", () => {
  assert.equal(isDrawerCompact(479), true);
  assert.equal(isDrawerCompact(480), false);
  assert.equal(isDrawerUltraCompact(419), true);
  assert.equal(isDrawerUltraCompact(420), false);
});

test("drawer range max respects mobile/tablet/desktop breakpoints", () => {
  assert.equal(getDrawerRangeMax(300), DRAWER_WIDTH_MIN);
  assert.equal(getDrawerRangeMax(500), 460);
  assert.equal(getDrawerRangeMax(700), DRAWER_WIDTH_MAX_MOBILE);
  assert.equal(getDrawerRangeMax(1000), DRAWER_WIDTH_MAX_TABLET);
  assert.equal(getDrawerRangeMax(2000), DRAWER_WIDTH_MAX_DESKTOP);
});

test("drawer width clamp handles minimum, maximum and in-range values", () => {
  assert.equal(clampDrawerWidth(120, 560), DRAWER_WIDTH_MIN);
  assert.equal(clampDrawerWidth(640, 560), 560);
  assert.equal(clampDrawerWidth(500, 560), 500);
});

test("width clamping predicate isolates over-the-limit values", () => {
  assert.equal(shouldClampDrawerWidth(561, 560), true);
  assert.equal(shouldClampDrawerWidth(560, 560), false);
});
