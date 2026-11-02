import { Anchor } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { routes } from "../../routes";
import { PageHeader } from "../../authed/PageHeader";

// Kept short so the search box and the first displays show on a phone's first
// screen. The competition details are one tap away for anyone who wants them.
export default function GalleryHeader() {
  return (
    <PageHeader
      title="Entries"
      actions={
        <Anchor
          {...routes.competitionDetails().link}
          size="sm"
          c="dimmed"
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <IconTrophy size={16} />
          Prizes
        </Anchor>
      }
    />
  );
}
