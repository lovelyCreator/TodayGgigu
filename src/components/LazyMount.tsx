import React, { useEffect, useState } from 'react';
import { InteractionManager, View } from 'react-native';

interface LazyMountProps {
  /**
   * When true the children render immediately. When false the placeholder is
   * shown and the children are scheduled to mount after the next interaction
   * (or after `delayMs`).
   */
  when?: boolean;
  /** Optional delay (ms) before mounting when `when` is true. Default: 0. */
  delayMs?: number;
  /**
   * Placeholder shown while children have not been mounted yet. Should match
   * the eventual layout footprint to avoid scroll jumps when children appear.
   */
  placeholder?: React.ReactNode;
  /** Stable estimated height used for the default placeholder. */
  minHeight?: number;
  children: React.ReactNode;
}

/**
 * Defers mounting of an expensive subtree until after the current interaction
 * (and optionally a short timer). Pairs with the FlatList-based screen layout
 * to keep initial paint cheap — heavy sections render only when their slot is
 * actually visible.
 */
const LazyMount: React.FC<LazyMountProps> = ({
  when = true,
  delayMs = 0,
  placeholder,
  minHeight = 240,
  children,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!when || mounted) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handle = InteractionManager.runAfterInteractions(() => {
      if (delayMs > 0) {
        timer = setTimeout(() => setMounted(true), delayMs);
      } else {
        setMounted(true);
      }
    });

    return () => {
      handle.cancel?.();
      if (timer) clearTimeout(timer);
    };
  }, [when, delayMs, mounted]);

  if (mounted) {
    return <>{children}</>;
  }

  return <>{placeholder ?? <View style={{ minHeight }} />}</>;
};

export default LazyMount;
