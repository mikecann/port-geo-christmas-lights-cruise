import type { ReactNode } from "react";
import { useState } from "react";
import { Alert, Button, Card, Group, Stack, Text } from "@mantine/core";
import {
  IconAlertTriangle,
  IconExternalLink,
  IconPlus,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { getConvexDeploymentName } from "../../../common/utils/convex";
import { AdminPageHeader } from "../AdminLayout";
import DeleteMyEntryButton from "./DeleteMyEntryButton";
import { GenerateMockVotesButton } from "./GenerateMockButtons";
import MockDataModal from "./MockDataModal";
import SendTestEmailButton from "./SendTestEmailButton";
import {
  WipeAllDataButton,
  WipeEntriesButton,
  WipeVotesButton,
} from "./WipeButtons";

const MOCK_VOTE_COUNT = 50;

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="sm">
        <Stack gap={2}>
          <Text fw={600}>{title}</Text>
          <Text size="sm" c="dimmed">
            {help}
          </Text>
        </Stack>
        <Group gap="sm">{children}</Group>
      </Stack>
    </Card>
  );
}

// System admins only: tools for testing and looking after the site
export default function DangerZonePage() {
  const [mockDataModalOpen, setMockDataModalOpen] = useState(false);
  const [entryCount, setEntryCount] = useState(10);
  const wipesAllowed = useQuery(api.admin.system.data.wipesAllowed, {});
  const deployment = getConvexDeploymentName();

  return (
    <Stack gap="xl">
      <AdminPageHeader
        title="Danger zone"
        description="Tools for testing and looking after the site. Only system admins can see this page."
      />

      <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />}>
        Some of these delete real data and can't be undone. Competition admins
        never need anything here.
      </Alert>

      <Section
        title="Database"
        help="Look at or edit the raw data in the Convex dashboard."
      >
        <Button
          leftSection={<IconExternalLink size={16} />}
          component="a"
          href={
            deployment
              ? `https://dashboard.convex.dev/d/${deployment}`
              : "https://dashboard.convex.dev"
          }
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
        >
          Open Convex dashboard
        </Button>
      </Section>

      <Section
        title="Testing"
        help="Check emails go out, and fill a test site with made-up entries and votes."
      >
        <SendTestEmailButton />
        <Button
          variant="outline"
          leftSection={<IconPlus size={16} />}
          onClick={() => setMockDataModalOpen(true)}
        >
          Generate Mock Entries
        </Button>
        <GenerateMockVotesButton voteCount={MOCK_VOTE_COUNT} />
        <DeleteMyEntryButton />
      </Section>

      <Section
        title="Wipes"
        help={
          wipesAllowed === false
            ? "Wipes are turned off on this deployment. Set ALLOW_DESTRUCTIVE_WIPES=true on a dev deployment to use them."
            : "Delete this year's entries, votes or both. Past years are always kept."
        }
      >
        <WipeEntriesButton disabled={wipesAllowed !== true} />
        <WipeVotesButton disabled={wipesAllowed !== true} />
        <WipeAllDataButton disabled={wipesAllowed !== true} />
      </Section>

      <MockDataModal
        opened={mockDataModalOpen}
        onClose={() => setMockDataModalOpen(false)}
        entryCount={entryCount}
        setEntryCount={setEntryCount}
      />
    </Stack>
  );
}
