import { Container, Stack, Title, Text, Button } from "@mantine/core";
import { routes } from "../routes";

export function NotFoundPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="lg" ta="center">
        <Title order={1} size="h1">
          404
        </Title>

        <Title order={2} size="h3" c="dimmed">
          Page Not Found
        </Title>

        <Text size="lg" c="dimmed">
          The page you're looking for doesn't exist or has been moved.
        </Text>

        <Button
          component="a"
          href={routes.home().href}
          variant="filled"
          size="md"
          mt="md"
        >
          Go Back Home
        </Button>
      </Stack>
    </Container>
  );
}
