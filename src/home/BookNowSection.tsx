import { Box, Button, Container, Stack } from "@mantine/core";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { routes } from "../routes";

export default function BookNowSection() {
  const { isAuthenticated } = useConvexAuth();
  return (
    <Box bg="#02051A" pb={20}>
      <Container size="sm">
        <Stack gap="sm">
          <Button
            component="a"
            {...routes.tickets().link}
            size="xl"
            radius="md"
            variant="filled"
            color="#C52630"
            fullWidth
            mt="md"
            styles={{
              root: {
                height: 80,
                fontSize: 24,
                fontWeight: 700,
              },
            }}
          >
            Book Tickets Now
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
