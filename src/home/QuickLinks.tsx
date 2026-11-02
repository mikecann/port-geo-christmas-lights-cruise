import { Button, Container, Group } from "@mantine/core";
import {
  IconChristmasTree,
  IconMap,
  IconThumbUp,
  IconTicket,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { routes } from "../routes";

// The three things most visitors come for, straight under the hero so nobody
// has to find the burger menu on a phone. Vote joins them while voting is open.
export default function QuickLinks() {
  const competition = useQuery(api.public.competitions.current, {});

  return (
    <Container size="sm" py="lg">
      <Group justify="center" gap="sm">
        {competition?.votingOpen && (
          <Button
            component="a"
            {...routes.voteLanding().link}
            color="#FBAF5D"
            leftSection={<IconThumbUp size={18} />}
          >
            Vote
          </Button>
        )}
        <Button
          component="a"
          {...routes.entries().link}
          variant="default"
          leftSection={<IconChristmasTree size={18} />}
        >
          Displays
        </Button>
        <Button
          component="a"
          {...routes.map().link}
          variant="default"
          leftSection={<IconMap size={18} />}
        >
          Map
        </Button>
        <Button
          component="a"
          {...routes.tickets().link}
          variant="default"
          leftSection={<IconTicket size={18} />}
        >
          Cruise tickets
        </Button>
      </Group>
    </Container>
  );
}
