import { useEffect, useRef } from 'react';

/**
 * Calls `step(n)` from requestAnimationFrame while `running`, with n chosen so
 * that roughly `stepsPerSecond` steps happen per second. `step` returns false
 * to stop (e.g. when training diverged).
 */
export function useTrainingLoop(running: boolean, stepsPerSecond: number, step: (n: number) => boolean | void, onStop?: () => void) {
  const live = useRef({ step, stepsPerSecond, onStop });
  live.current = { step, stepsPerSecond, onStop };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * live.current.stepsPerSecond;
      last = now;
      const n = Math.min(Math.floor(acc), 50);
      if (n > 0) {
        acc -= n;
        if (live.current.step(n) === false) {
          live.current.onStop?.();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}
