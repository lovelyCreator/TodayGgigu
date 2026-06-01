/** Design baseline (~390pt wide); inset/gap scale with window width. */
const BASE_WIDTH = 390;
const INSET_AT_BASE = 16;

const HORIZONTAL_RATIO = INSET_AT_BASE / BASE_WIDTH;

export type ProfileMoreToLoveGridLayout = {
  horizontalInset: number;
  columnGap: number;
  cardWidth: number;
  rowGap: number;
};

/** Two-column grid: side insets and column gap match; card width fills the remainder. */
export function getProfileMoreToLoveGridLayout(
  windowWidth: number,
): ProfileMoreToLoveGridLayout {
  const horizontalInset = windowWidth * HORIZONTAL_RATIO;
  const columnGap = horizontalInset;
  const cardWidth = (windowWidth - horizontalInset * 2 - columnGap) / 2;
  const rowGap = horizontalInset;

  return {
    horizontalInset,
    columnGap,
    cardWidth,
    rowGap,
  };
}
