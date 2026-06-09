import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  getContentMaxWidth,
  getModalMaxWidth,
  getPagePaddingHorizontal,
} from '../utils/responsiveLayout';

/**
 * Reactive layout metrics that recalculate on every dimension change
 * (rotation, foldable resize, Android split-screen, …).
 *
 * Breakpoints follow Material's compact / medium / expanded buckets,
 * collapsed to two phone-vs-tablet families here for simplicity:
 *
 *   - phone        : width  < 600        (most handsets, all orientations)
 *   - tabletPort   : 600 ≤ width < 900   (small tablets / large phones portrait)
 *   - tabletLand   : width ≥ 900         (tablets in landscape or large tablets)
 *
 * `cols` is the recommended product-grid column count for that bucket:
 *   phone = 2, tabletPort = 3, tabletLand = 4.
 *
 * `gutter`, `iconSize` and `imageScale` follow the same bucket so callers
 * can pull them straight in without redoing the breakpoint math.
 */
export interface ResponsiveLayout {
  width: number;
  height: number;
  isLandscape: boolean;
  isTablet: boolean;
  isTabletLandscape: boolean;
  cols: number;
  gutter: number;
  /** Recommended icon/button size in px for the current device class. */
  iconSize: number;
  /** Linear scale (1 on phone, ~1.15 on tablet portrait, ~1.3 on tablet landscape). */
  scale: number;
  /** Bucket name for explicit conditionals. */
  bucket: 'phone' | 'tabletPort' | 'tabletLand';
  /** 태블릿에서 폼·리스트 본문 최대 너비 (폰은 화면 전체). */
  contentMaxWidth: number;
  /** 태블릿 좌우 여백 — contentMaxWidth 를 화면 중앙에 맞출 때 사용. */
  pagePaddingHorizontal: number;
  /** 태블릿 모달 권장 최대 너비. */
  modalMaxWidth: number;
}

export const useResponsive = (): ResponsiveLayout => {
  const { width, height } = useWindowDimensions();

  return useMemo<ResponsiveLayout>(() => {
    const isLandscape = width > height;
    const minDim = Math.min(width, height);

    // A device is a "tablet" when its shorter side is ≥ 600px.
    // (Phones have shorter side < 600 even in landscape.)
    const isTablet = minDim >= 600;
    const isTabletLandscape = isTablet && isLandscape;

    let bucket: ResponsiveLayout['bucket'];
    let cols: number;
    let scale: number;
    if (!isTablet) {
      bucket = 'phone';
      cols = 2;
      scale = 1;
    } else if (!isLandscape) {
      bucket = 'tabletPort';
      cols = 3;
      scale = 1.15;
    } else {
      bucket = 'tabletLand';
      cols = 4;
      scale = 1.3;
    }

    // Gutter grows with the screen — keep cards a comfortable distance
    // from the edges on big tablets.
    const gutter = Math.round(16 * scale);
    const iconSize = Math.round(24 * scale);

    const layoutBase = {
      width,
      height,
      isLandscape,
      isTablet,
      isTabletLandscape,
      cols,
      gutter,
      iconSize,
      scale,
      bucket,
    };

    return {
      ...layoutBase,
      contentMaxWidth: getContentMaxWidth(layoutBase),
      pagePaddingHorizontal: getPagePaddingHorizontal(layoutBase),
      modalMaxWidth: getModalMaxWidth(layoutBase),
    };
  }, [width, height]);
};
