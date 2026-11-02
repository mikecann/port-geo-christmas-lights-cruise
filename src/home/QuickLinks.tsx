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
import type { HomeSeason } from "./season";

// The three things most visitors come for, straight under the hero so nobody
// has to find the burger menu on a phone. Vote joins them while voting is open.
export default function QuickLinks({ season }: { season: HomeSeason }) {
  const competition = useQuery(api.public.competitions.current, {});

  const displays = (
    <Button
      key="displays"
      component="a"
      {...routes.entries().link}
      variant="default"
      leftSection={<IconChristmasTree size={18} />}
    >
      Displays
    </Button>
  );
  const map = (
    <Button
      key="map"
      component="a"
      {...routes.map().link}
      variant="default"
      leftSection={<IconMap size={18} />}
    >
      Map
    </Button>
  );
  const tickets = (
    <Button
      key="tickets"
      component="a"
      {...routes.tickets().link}
      variant="default"
      leftSection={<IconTicket size={18} />}
    >
      Cruise tickets
    </Button>
  );

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
        {/* Cruise season puts booking and finding the displays first */}
        {season === "cruises"
          ? [tickets, map, displays]
          : [displays, map, tickets]}
      </Group>
    </Container>
  );
}
