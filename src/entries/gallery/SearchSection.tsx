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
    <Stack gap="lg" align="center">
      <TextInput
        placeholder="Search by entry name, address, or entry number..."
        value={searchQuery}
        onChange={(event) => onSearchChange(event.currentTarget.value)}
        leftSection={
          isSearching ? <Loader size={18} /> : <IconSearch size={18} />
        }
        size="lg"
        w={{ base: "100%", sm: 600 }}
        styles={{
          input: {
            borderRadius: "var(--mantine-radius-md)",
            fontSize: "1rem",
            "&:focus": {
              borderColor: "#FBAF5D",
            },
          },
        }}
      />
      {/* Results Summary - only show when meaningful */}
      {searchQuery && displayResults.length > 0 && (
        <Text size="sm" c="dimmed" ta="center">
          {isSearching
            ? `Searching...${cachedSearchQuery ? ` (showing results from "${cachedSearchQuery}")` : ""}`
            : `Found ${displayResults.length} of ${totalCount} ${displayResults.length === 1 ? "entry" : "entries"}`}
        </Text>
      )}
    </Stack>
  );
}
