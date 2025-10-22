import { Container, Stack, Center, Loader, Group, Text } from "@mantine/core";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { EntryWithFirstPhoto } from "../../../convex/public/entries";
import EntriesGrid from "./EntriesGrid";
import GalleryHeader from "./GalleryHeader";
import SearchSection from "./SearchSection";
import NoResultsMessage from "./NoResultsMessage";
import SkeletonGrid from "./SkeletonGrid";
import { useMemo, useState, useEffect } from "react";
import { useDebounce } from "use-debounce";

export default function EntriesGalleryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [cachedResults, setCachedResults] = useState<
    Array<EntryWithFirstPhoto>
  >([]);
  const [cachedSearchQuery, setCachedSearchQuery] = useState("");
  const totalCount = useQuery(api.public.entries.count);

  const results = useQuery(api.public.entries.listWithFirstPhoto);

  // Cache results when they're available
  const baseResults = useMemo(() => {
    if (results !== undefined) return results;

    return cachedResults;
  }, [results, cachedResults]);

  // Update cached results in a separate effect
  useEffect(() => {
    if (results !== undefined)
      queueMicrotask(() => {
        setCachedResults(results);
        setCachedSearchQuery(debouncedSearchQuery);
      });
  }, [results, debouncedSearchQuery]);

  const dailySeed = new Date().toISOString().slice(0, 10);

  // Client-side filter and shuffle
  const displayResults = useMemo(() => {
    const list = baseResults ?? [];
    const q = debouncedSearchQuery.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (item) =>
            (item.entry.name ?? "").toLowerCase().includes(q) ||
            (item.entry.houseAddress?.address ?? "")
              .toLowerCase()
              .includes(q) ||
            (item.entry.status === "approved"
              ? `${item.entry.entryNumber}`.includes(q)
              : false),
        )
      : list;
    return shuffleDeterministic(filtered, dailySeed);
  }, [baseResults, debouncedSearchQuery, dailySeed]);
  const isSearching =
    results === undefined && !isInitialLoad && cachedResults.length > 0;

  // Mark initial load as complete once we have results
  useEffect(() => {
    if (results !== undefined && isInitialLoad)
      queueMicrotask(() => setIsInitialLoad(false));
  }, [results, isInitialLoad]);

  // Show skeleton grid on initial load instead of loading spinner
  if (results === undefined && isInitialLoad)
    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <GalleryHeader />
          <SearchSection
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isSearching={false}
            displayResults={[]}
            totalCount={totalCount}
            cachedSearchQuery=""
          />
          <SkeletonGrid />
        </Stack>
      </Container>
    );

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <GalleryHeader />

        {/* Search Bar */}
        <SearchSection
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearching={isSearching}
          displayResults={displayResults}
          totalCount={totalCount}
          cachedSearchQuery={cachedSearchQuery}
        />

        {/* No Results Message */}
        {displayResults.length === 0 && searchQuery && (
          <NoResultsMessage searchQuery={searchQuery} />
        )}

        {/* Entries Grid */}
        <EntriesGrid entries={displayResults} isLoading={false} />

        {/* No pagination - full results returned by query */}
      </Stack>
    </Container>
  );
}

// Client-side deterministic shuffle with seed
function shuffleDeterministic<T>(items: Array<T>, seed: string): Array<T> {
  const seedNumber = xmur3(seed)();
  const rng = mulberry32(seedNumber);
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = copy[i];
    copy[i] = copy[j];
    copy[j] = t;
  }
  return copy;
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
