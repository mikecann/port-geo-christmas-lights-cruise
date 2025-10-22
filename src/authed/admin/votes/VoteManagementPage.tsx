import {
  Container,
  Title,
  Stack,
  Card,
  Text,
  Group,
  Divider,
  Badge,
  Tabs,
} from "@mantine/core";
import { IconListCheck } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { useMe } from "../../../auth/useMeHooks";
import { Breadcrumbs } from "../../../common/components/Breadcrumbs";
import { routes } from "../../../routes";
import VoteCategoryTab from "./VoteCategoryTab";

export default function VoteManagementPage() {
  const me = useMe();
  const [activeTab, setActiveTab] = useState<string | null>("best_display");

  const bestCount = useQuery(api.admin.competition.votes.countForCategory, {
    category: "best_display",
  });
  const jollyCount = useQuery(api.admin.competition.votes.countForCategory, {
    category: "most_jolly",
  });

  const breadcrumbItems = [
    {
      label: "Admin Panel",
      onClick: () => routes.admin().push(),
    },
    {
      label: "Vote Management",
      isActive: true,
    },
  ];

  const isAllowed = Boolean(me?.isCompetitionAdmin || me?.isSystemAdmin);
  if (!isAllowed)
    return (
      <Container size="md" py="xl">
        <Text c="red">
          Access denied. Competition or system admin permissions required.
        </Text>
      </Container>
    );

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="sm">
        Vote Management
      </Title>

      <Breadcrumbs items={breadcrumbItems} />

      <Stack gap="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group>
              <IconListCheck size={32} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="lg" fw={500}>
                  Public Voting Overview
                </Text>
                <Text size="sm" c="dimmed">
                  Review votes by category and see who voted for each entry
                </Text>
              </div>
            </Group>

            <Divider />

            <Tabs value={activeTab} onChange={setActiveTab} pt="md">
              <Tabs.List>
                <Tabs.Tab
                  value="best_display"
                  rightSection={
                    <Badge variant="light" color="blue" size="sm">
                      {bestCount}
                    </Badge>
                  }
                >
                  Best Display
                </Tabs.Tab>
                <Tabs.Tab
                  value="most_jolly"
                  rightSection={
                    <Badge variant="light" color="grape" size="sm">
                      {jollyCount}
                    </Badge>
                  }
                >
                  Most Jolly
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="best_display" pt="lg">
                {activeTab === "best_display" && (
                  <VoteCategoryTab category="best_display" />
                )}
              </Tabs.Panel>

              <Tabs.Panel value="most_jolly" pt="lg">
                {activeTab === "most_jolly" && (
                  <VoteCategoryTab category="most_jolly" />
                )}
              </Tabs.Panel>
            </Tabs>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
