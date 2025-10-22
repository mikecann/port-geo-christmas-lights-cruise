import { Container, Stack, Card, Grid } from "@mantine/core";
import { AspectRatio, Group, Skeleton } from "@mantine/core";

export default function EntryPageSkeleton() {
  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Image Carousel Skeleton */}
        <Card withBorder p={0} radius="md">
          <AspectRatio ratio={16 / 10}>
            <Skeleton height="100%" radius="md" />
          </AspectRatio>
        </Card>

        {/* Entry Info and Voting Section Skeleton */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Skeleton height={28} width="60%" />
              <Skeleton height={16} width="40%" />
              <Group gap="sm">
                <Skeleton height={28} width={80} />
                <Skeleton height={28} width={100} />
                <Skeleton height={28} width={90} />
              </Group>
              <Stack gap="xs">
                <Skeleton height={14} width="90%" />
                <Skeleton height={14} width="80%" />
                <Skeleton height={14} width="85%" />
              </Stack>
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Stack gap="sm">
                <Skeleton height={20} width="50%" />
                <Skeleton height={36} />
                <Skeleton height={36} />
                <Skeleton height={36} />
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Admin Section Skeleton */}
        <Card withBorder radius="md" p="md">
          <Stack gap="sm">
            <Skeleton height={20} width="30%" />
            <Skeleton height={14} width="80%" />
            <Skeleton height={14} width="70%" />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
