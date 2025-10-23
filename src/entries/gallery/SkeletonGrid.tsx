import {
  SimpleGrid,
  Card,
  Stack,
  Group,
  Skeleton,
  AspectRatio,
  Box,
} from "@mantine/core";

function SkeletonCard() {
  return (
    <Card shadow="sm" padding={0} radius="lg" withBorder>
      <Stack gap={0}>
        {/* Image Skeleton with Entry Number Badge */}
        <Box style={{ position: "relative" }}>
          <AspectRatio ratio={16 / 12}>
            <Skeleton height="100%" radius={0} />
          </AspectRatio>
          {/* Entry Number Badge Skeleton */}
          <Box
            style={{
              position: "absolute",
              top: 12,
              right: 12,
            }}
          >
            <Skeleton height={32} width={50} radius="md" />
          </Box>
        </Box>

        {/* Entry Info Skeleton */}
        <Stack gap="md" p="lg">
          {/* Title Skeleton */}
          <Box>
            <Skeleton height={28} width="85%" mb={4} />
            <Skeleton height={28} width="60%" />
          </Box>

          {/* Address with Icon Skeleton */}
          <Group gap="xs" align="flex-start">
            <Skeleton height={18} width={18} mt={2} />
            <Box style={{ flex: 1 }}>
              <Skeleton height={18} width="95%" mb={4} />
              <Skeleton height={18} width="70%" />
            </Box>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

export default function SkeletonGrid() {
  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, lg: 3 }}
      spacing="xl"
      verticalSpacing="xl"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </SimpleGrid>
  );
}
