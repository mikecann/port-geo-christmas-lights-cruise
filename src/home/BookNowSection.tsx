import { Box, Button, Container, Stack, Group } from "@mantine/core";
import { useState } from "react";
import { useMediaQuery } from "@mantine/hooks";
import { Authenticated, Unauthenticated, useConvexAuth } from "convex/react";
import { routes } from "../routes";
import VoteModal from "./VoteModal";

export default function BookNowSection() {
  const { isAuthenticated } = useConvexAuth();
  const [voteOpen, setVoteOpen] = useState(false);
  return (
    <Box bg="#02051A" pb={20}>
      <Container size="sm">
        <Stack gap="sm">
          {(() => {
            const isSmall = useMediaQuery("(max-width: 768px)");
            if (isSmall) {
              return (
                <Stack gap="0">
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
                    Book Tickets
                  </Button>
                  <Button
                    onClick={() => setVoteOpen(true)}
                    size="xl"
                    radius="md"
                    variant="filled"
                    color="#fab15f"
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
                    Vote for Entry
                  </Button>
                </Stack>
              );
            }

            return (
              <Group grow gap="md" style={{ alignItems: "stretch" }}>
                <Button
                  component="a"
                  {...routes.tickets().link}
                  size="xl"
                  radius="md"
                  variant="filled"
                  color="#C52630"
                  mt="md"
                  styles={{
                    root: {
                      height: 80,
                      fontSize: 24,
                      fontWeight: 700,
                    },
                  }}
                >
                  Book Tickets
                </Button>
                <Button
                  onClick={() => setVoteOpen(true)}
                  size="xl"
                  radius="md"
                  variant="filled"
                    color="#fab15f"
                  mt="md"
                  styles={{
                    root: {
                      height: 80,
                      fontSize: 24,
                      fontWeight: 700,
                    },
                  }}
                >
                  Vote for Entry
                </Button>
              </Group>
            );
          })()}
          <VoteModal opened={voteOpen} onClose={() => setVoteOpen(false)} />
        </Stack>
      </Container>
    </Box>
  );
}
