import { useRef } from "react";
import { useQuery } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

/**
 * A wrapper around useQuery that maintains the previous data until new data is loaded.
 * This prevents flickering and maintains UI stability during refetching.
 */
export function useStableQuery<Query extends FunctionReference<"query">>(
  query: Query,
  ...args: OptionalRestArgs<Query>
): ReturnType<typeof useQuery<Query>> {
  const result = useQuery(query, ...args);
  const storedData = useRef<typeof result>(result);

  // Update stored data when new data is available and different
  if (result !== undefined) storedData.current = result;

  // Return the current result if available, otherwise return stored data
  return result === undefined ? storedData.current : result;
}
