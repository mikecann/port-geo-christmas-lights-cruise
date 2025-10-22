import { Stack, TextInput, Text, Loader } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import type { EntryWithFirstPhoto } from "../../../convex/public/entries";

interface SearchSectionProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  displayResults: Array<EntryWithFirstPhoto>;
  totalCount?: number;
  cachedSearchQuery: string;
}

export default function SearchSection({
  searchQuery,
  onSearchChange,
  isSearching,
  displayResults,
  totalCount,
  cachedSearchQuery,
}: SearchSectionProps) {
  return (
    <Stack gap="sm" align="center">
      <TextInput
        placeholder="Search by entry name, address, or entry number..."
        value={searchQuery}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        leftSection={
          isSearching ? <Loader size={16} /> : <IconSearch size={16} />
        }
        size="lg"
        w={{ base: "100%", sm: 500 }}
        styles={{
          input: {
            borderRadius: "var(--mantine-radius-md)",
          },
        }}
      />
      {/* Subtle Results Summary */}
      {displayResults.length > 0 && (
        <Text size="sm" c="dimmed" ta="center">
          {isSearching
            ? `Searching... (showing ${displayResults.length} ${displayResults.length === 1 ? "result" : "results"}${cachedSearchQuery ? ` from "${cachedSearchQuery}"` : ""})`
            : searchQuery
              ? `Found ${displayResults.length} of ${totalCount} ${displayResults.length === 1 ? "entry" : "entries"} matching "${searchQuery}"`
              : `Showing ${displayResults.length} of ${totalCount} competition ${displayResults.length === 1 ? "entry" : "entries"}`}
        </Text>
      )}
    </Stack>
  );
}
