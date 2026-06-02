import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

/**
 * Reveals stages 0..N over time so heavy work spreads across multiple
 * frames instead of mounting everything at once.
 *
 * Stage 0 is returned immediately on first render — the caller should use
 * that to render the critical path. After the next interaction has settled
 * we start a `setTimeout` chain that advances the stage every `intervalMs`,
 * giving the JS thread breathing room between mounts.
 *
 *   const stage = useStaggeredReveal(4, 80);
 *   // stage starts at 0, becomes 1 ~80ms later, then 2, then 3.
 *
 * Pause the timer by resetting `enabled` to false (e.g. on background).
 */
export const useStaggeredReveal = (
  stageCount: number,
  intervalMs = 80,
  enabled = true,
): number => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!enabled || stage >= stageCount - 1) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handle = InteractionManager.runAfterInteractions(() => {
      const tick = () => {
        setStage((s) => {
          const next = s + 1;
          if (next < stageCount - 1) {
            timer = setTimeout(tick, intervalMs);
          }
          return next;
        });
      };
      timer = setTimeout(tick, intervalMs);
    });

    return () => {
      handle.cancel?.();
      if (timer) clearTimeout(timer);
    };
    // intentionally not depending on `stage` so the chain isn't restarted
    // every tick; we read it via the functional setter instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, stageCount, intervalMs]);

  return stage;
};
