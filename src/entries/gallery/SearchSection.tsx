import { Button, Group, Stack, TextInput, Text, Loader } from "@mantine/core";
import { IconMap, IconSearch } from "@tabler/icons-react";
import { routes } from "../../routes";

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
    <Stack gap="xs">
      <Group gap="sm" wrap="nowrap">
        <TextInput
          aria-label="Search entries"
          placeholder="Name, street or number"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          leftSection={
            isSearching ? <Loader size={18} /> : <IconSearch size={18} />
          }
          // 16px text stops iPhones zooming in when the box is tapped
          size="md"
          type="search"
          style={{ flex: 1, maxWidth: 480 }}
        />
        <Button
          component="a"
          {...routes.map().link}
          variant="default"
          size="md"
          leftSection={<IconMap size={18} />}
        >
          Map
        </Button>
      </Group>
      {/* Results Summary - only show when meaningful */}
      {searchQuery && displayResults.length > 0 && (
        <Text size="sm" c="dimmed">
          {isSearching
            ? `Searching...${cachedSearchQuery ? ` (showing results from "${cachedSearchQuery}")` : ""}`
            : `Found ${displayResults.length} of ${totalCount} ${displayResults.length === 1 ? "entry" : "entries"}`}
        </Text>
      )}
    </Stack>
  );
}
