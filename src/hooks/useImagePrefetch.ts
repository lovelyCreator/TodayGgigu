import { useEffect, useRef, useCallback } from 'react';
import { Image } from 'react-native';

/**
 * Prefetches the neighbours of the currently viewed image in a horizontal
 * gallery. We fire-and-forget ±`radius` URLs around `currentIndex` and keep a
 * `Set` of already-requested URLs so the same image is never prefetched twice.
 *
 * `Image.prefetch` warms the disk/memory cache so the next swipe paints
 * instantly instead of waiting on the network.
 */
export const useGalleryPrefetch = (
  images: string[],
  currentIndex: number,
  radius = 1,
) => {
  const requestedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!images || images.length === 0) return;

    const start = Math.max(0, currentIndex - radius);
    const end = Math.min(images.length - 1, currentIndex + radius);

    for (let i = start; i <= end; i += 1) {
      const url = images[i];
      if (!url || requestedRef.current.has(url)) continue;
      requestedRef.current.add(url);
      Image.prefetch(url).catch(() => {
        // Swallow — prefetch failures are non-fatal; the image will simply
        // load on demand when the user scrolls to it.
        requestedRef.current.delete(url);
      });
    }
  }, [images, currentIndex, radius]);
};

/**
 * Returns an `onViewableItemsChanged` handler that prefetches the image URL
 * of every item that just became visible. Use with FlatList for grids/lists
 * where you want to warm covers only for cards actually entering the
 * viewport (cheap on metered connections).
 */
export const useViewablePrefetch = <T,>(getUrl: (item: T) => string | undefined) => {
  const requestedRef = useRef<Set<string>>(new Set());

  return useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: T }> }) => {
      for (const v of viewableItems) {
        const url = getUrl(v.item);
        if (!url || requestedRef.current.has(url)) continue;
        requestedRef.current.add(url);
        Image.prefetch(url).catch(() => {
          requestedRef.current.delete(url);
        });
      }
    },
    [getUrl],
  );
};
