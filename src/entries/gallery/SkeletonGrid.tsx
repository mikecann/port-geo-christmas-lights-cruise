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
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Stack gap="md">
        {/* Image Skeleton */}
        <AspectRatio ratio={16 / 12}>
          <Skeleton height="100%" radius="sm" />
        </AspectRatio>

        {/* Entry Header Skeleton */}
        <Stack gap="xs">
          <Group justify="space-between" align="flex-start">
            {/* Title */}
            <Box style={{ flex: 1 }}>
              <Skeleton height={24} width="80%" mb={4} />
            </Box>
            {/* Badge */}
            <Skeleton height={20} width={40} radius="sm" />
          </Group>

          {/* Address with Icon */}
          <Group gap="xs" align="flex-start">
            <Skeleton height={16} width={16} mt={2} />
            <Box style={{ flex: 1 }}>
              <Skeleton height={16} width="90%" mb={2} />
              <Skeleton height={16} width="60%" />
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
      spacing="lg"
      verticalSpacing="xl"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </SimpleGrid>
  );
}
