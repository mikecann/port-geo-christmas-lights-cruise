import { useMatches } from "@mantine/core";

// True below Mantine's sm breakpoint, where pages switch to their phone
// layout. Read on the first render, so a desktop never flashes the phone
// version first.
export function useIsPhone() {
  return useMatches(
    { base: true, sm: false },
    { getInitialValueInEffect: false },
  );
}
