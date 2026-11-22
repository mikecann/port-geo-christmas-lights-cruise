import {
  IconLayoutGrid,
  IconMap,
  IconSquareCheck,
  IconTicket,
  IconTrophy,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import type { Link } from "type-route";
import { api } from "../../../convex/_generated/api";
import { routes, routeGroups, useRoute } from "../../routes";

export type MenuItemData = {
  label: string;
  icon: typeof IconMap;
  link: Link;
  isActive: boolean;
};

// The site's pages, for either frame's phone menu
export function useSiteItems(): MenuItemData[] {
  const route = useRoute();
  const competition = useQuery(api.public.competitions.current, {});
  const items: MenuItemData[] = [
    {
      label: "Entries",
      icon: IconLayoutGrid,
      link: routes.entries().link,
      isActive: route.name === "entries" || route.name === "entry",
    },
    {
      label: "Map",
      icon: IconMap,
      link: routes.map().link,
      isActive: routeGroups.map.has(route),
    },
    {
      label: "Tickets",
      icon: IconTicket,
      link: routes.tickets().link,
      isActive: route.name === "tickets",
    },
    {
      label: "Competition",
      icon: IconTrophy,
      link: routes.competitionDetails().link,
      isActive: route.name === "competitionDetails",
    },
  ];
  if (competition?.votingOpen)
    items.unshift({
      label: "Vote",
      icon: IconSquareCheck,
      link: routes.voteLanding().link,
      isActive: routeGroups.voteScreen.has(route),
    });
  return items;
}
