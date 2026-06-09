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

/** Product grid: side insets and column gap match; card width fills the remainder. */
export function getProfileMoreToLoveGridLayout(
  windowWidth: number,
  cols = 2,
): ProfileMoreToLoveGridLayout {
  const safeCols = Math.max(1, cols);
  const horizontalInset = windowWidth * HORIZONTAL_RATIO;
  const columnGap = horizontalInset;
  const cardWidth =
    (windowWidth - horizontalInset * 2 - columnGap * (safeCols - 1)) / safeCols;
  const rowGap = horizontalInset;

  return {
    horizontalInset,
    columnGap,
    cardWidth,
    rowGap,
  };
}
