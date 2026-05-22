export const DRAWER_WIDTH_COMPACT = 480;
export const DRAWER_WIDTH_ULTRA_COMPACT = 420;
export const DRAWER_WIDTH_MIN = 360;
export const DRAWER_WIDTH_MAX_DESKTOP = 980;
export const DRAWER_WIDTH_MAX_TABLET = 760;
export const DRAWER_WIDTH_MAX_MOBILE = 560;

export function isDrawerCompact(width: number): boolean {
  return width < DRAWER_WIDTH_COMPACT;
}

export function isDrawerUltraCompact(width: number): boolean {
  return width < DRAWER_WIDTH_ULTRA_COMPACT;
}

export function toggleDrawerOpen(open: boolean): boolean {
  return !open;
}

export function closeDrawer(): false {
  return false;
}

export function getDrawerRangeMax(viewportWidth: number): number {
  const responsiveMax = Math.floor(viewportWidth * 0.92);
  const breakpointMax =
    viewportWidth < 768
      ? DRAWER_WIDTH_MAX_MOBILE
      : viewportWidth < 1280
        ? DRAWER_WIDTH_MAX_TABLET
        : DRAWER_WIDTH_MAX_DESKTOP;
  return Math.max(DRAWER_WIDTH_MIN, Math.min(responsiveMax, breakpointMax));
}

export function clampDrawerWidth(width: number, drawerRangeMax: number): number {
  return Math.min(Math.max(width, DRAWER_WIDTH_MIN), drawerRangeMax);
}

export function shouldClampDrawerWidth(width: number, drawerRangeMax: number): boolean {
  return width > drawerRangeMax;
}
