import type { ResponsiveLayout } from '../hooks/useResponsive';

/** Shorter side ≥ 600px → tablet (matches useResponsive). */
export const TABLET_MIN_SHORT_SIDE = 600;

export const getContentMaxWidth = (layout: ResponsiveLayout): number => {
  if (!layout.isTablet) return layout.width;
  if (layout.isTabletLandscape) {
    return Math.min(layout.width - layout.gutter * 2, 1100);
  }
  return Math.min(layout.width - layout.gutter * 2, 720);
};

export const getPagePaddingHorizontal = (layout: ResponsiveLayout): number => {
  if (!layout.isTablet) return 0;
  const maxW = getContentMaxWidth(layout);
  return Math.max(layout.gutter, Math.floor((layout.width - maxW) / 2));
};

/**
 * 상품리스트 등 그리드·필터가 많은 화면 — 태블릿(가로·세로 모두)에서는 좁은
 * 중앙 컬럼 대신 화면 전체에 적당한 좌우 여백(gutter*1.5)만 두고 넓게 쓴다.
 */
export const getListPagePadding = (layout: ResponsiveLayout): number => {
  if (!layout.isTablet) return 0;
  return Math.round(layout.gutter * 1.5);
};

export const getListPageContentWidth = (layout: ResponsiveLayout): number => {
  if (!layout.isTablet) return layout.width;
  const pad = getListPagePadding(layout);
  return layout.width - pad * 2;
};

export const getModalMaxWidth = (layout: ResponsiveLayout): number => {
  if (!layout.isTablet) return layout.width - 32;
  return Math.min(560, Math.floor(layout.width * 0.55));
};

/** FlatList / grid card width for N equal columns inside a padded container. */
export const getGridItemWidth = (
  containerWidth: number,
  cols: number,
  gap: number,
): number => {
  if (cols <= 1) return containerWidth;
  return Math.floor((containerWidth - gap * (cols - 1)) / cols);
};

/** Profile 태블릿 가로 사이드바 너비 (ProfileTabletSidebar 와 동일 공식). */
export const getProfileTabletSidebarWidth = (windowWidth: number): number =>
  Math.min(280, Math.max(200, Math.round(windowWidth * 0.22)));

/** 임베드 대시보드 패널의 가용 너비 추정 (onLayout 전 초기값). */
export const getEmbeddedDashboardPanelWidth = (
  windowWidth: number,
  horizontalPad = 0,
): number =>
  Math.max(0, windowWidth - getProfileTabletSidebarWidth(windowWidth) - horizontalPad * 2);

/** 상품리스트 그리드 카드 최소 너비 — 이보다 좁아지면 열 수를 줄인다. */
export const PRODUCT_MGMT_GRID_MIN_CARD_WIDTH = 136;

/** 상품리스트 그리드 최대 열 수. */
export const PRODUCT_MGMT_GRID_MAX_COLS = 6;

/**
 * 컨테이너 너비에 맞춰 그리드 열 수를 계산한다.
 * minCardWidth 이상이 되도록 열 수를 줄이고, maxCols 를 넘지 않는다.
 */
export const getResponsiveGridCols = (
  containerWidth: number,
  gap: number,
  minCardWidth: number,
  maxCols: number,
): number => {
  if (containerWidth <= 0) return 1;
  const cappedMax = Math.max(1, maxCols);
  for (let cols = cappedMax; cols >= 1; cols -= 1) {
    if (getGridItemWidth(containerWidth, cols, gap) >= minCardWidth) {
      return cols;
    }
  }
  return 1;
};

export const scaleResponsiveSize = (base: number, scale: number): number =>
  Math.round(base * scale);
