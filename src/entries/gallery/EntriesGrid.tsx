import {
  SimpleGrid,
  Card,
  Center,
  Stack,
  Text,
  Loader,
  Box,
} from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import type { EntryWithFirstPhoto } from "../../../convex/public/entries";
import EntryGalleryCard from "./EntryGalleryCard";

interface EntriesGridProps {
  entries: Array<EntryWithFirstPhoto>;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  gridCols?: { base: number; sm?: number; lg?: number };
  spacing?: string;
  verticalSpacing?: string;
  isLoading?: boolean;
}

export default function EntriesGrid({
  entries,
  emptyStateTitle = "No entries yet",
  emptyStateDescription = "Competition entries will appear here once they are approved. Check back soon to see the amazing Christmas light displays!",
  gridCols = { base: 1, sm: 2, lg: 3 },
  spacing = "lg",
  verticalSpacing = "xl",
  isLoading = false,
}: EntriesGridProps) {
  if (entries.length === 0)
    return (
      <Card withBorder p="xl">
        <Center>
          <Stack gap="sm" align="center">
            <IconTrophy size={48} color="gray" />
            <Text size="lg" fw={500}>
              {emptyStateTitle}
            </Text>
            <Text size="md" c="dimmed" ta="center">
              {emptyStateDescription}
            </Text>
          </Stack>
        </Center>
      </Card>
    );

  return (
    <Box style={{ position: "relative" }}>
      <SimpleGrid
        cols={gridCols}
        spacing={spacing}
        verticalSpacing={verticalSpacing}
        style={{
          opacity: isLoading ? 0.6 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {entries.map((item) => (
          <EntryGalleryCard
            key={item.entry._id}
            entry={item.entry}
            photo={item.photo}
          />
        ))}
      </SimpleGrid>
      {isLoading && (
        <Center
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}
        >
          <Loader size="lg" />
        </Center>
      )}
    </Box>
  );
}
