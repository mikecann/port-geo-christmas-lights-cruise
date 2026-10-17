import { useCallback, useSyncExternalStore } from "react";

// Whether the window has scrolled further than `threshold`. Re-renders only
// when that flips, and doesn't listen to scrolling at all while disabled.
export function useScrolledPast(threshold: number, enabled = true) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) return () => {};
      window.addEventListener("scroll", onChange, { passive: true });
      return () => window.removeEventListener("scroll", onChange);
    },
    [enabled],
  );
  return useSyncExternalStore(
    subscribe,
    () => enabled && window.scrollY > threshold,
  );
}
