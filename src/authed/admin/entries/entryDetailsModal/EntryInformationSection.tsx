import { Text, Stack, Group, Card, SimpleGrid } from "@mantine/core";
import {
  IconMapPin,
  IconCalendar,
  IconUser,
  IconBadge,
  IconNumber,
} from "@tabler/icons-react";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import StatusBadge from "../../../../common/components/StatusBadge";

interface EntryInformationSectionProps {
  entry: Doc<"entries">;
}

export default function EntryInformationSection({
  entry,
}: EntryInformationSectionProps) {
  const informationItems = [
    {
      icon: <IconUser size={16} color="gray" />,
      label: "Entry Name",
      value: entry.name,
    },
    {
      icon: <IconBadge size={16} color="gray" />,
      label: "Status",
      value: <StatusBadge status={entry.status} />,
    },
    ...(entry.status === "approved"
      ? [
          {
            icon: <IconNumber size={16} color="gray" />,
            label: "Entry Number",
            value: `#${entry.entryNumber}`,
          },
        ]
      : []),
    {
      icon: <IconMapPin size={16} color="gray" />,
      label: "Address",
      value: entry.houseAddress,
    },
    {
      icon: <IconCalendar size={16} color="gray" />,
      label: "Created",
      value: `${new Date(entry._creationTime).toLocaleDateString()} at ${new Date(entry._creationTime).toLocaleTimeString()}`,
    },
    ...(entry.status !== "draft" && "submittedAt" in entry
      ? [
          {
            icon: <IconCalendar size={16} color="gray" />,
            label: "Submitted",
            value: `${new Date(entry.submittedAt).toLocaleDateString()} at ${new Date(entry.submittedAt).toLocaleTimeString()}`,
          },
        ]
      : []),
  ];

  return (
    <Card withBorder p="md">
      <Text fw={500} mb="md">
        Entry Information
      </Text>
      <SimpleGrid cols={2} spacing="md" verticalSpacing="md">
        {informationItems.map((item, index) => (
          <Group key={index} align="flex-start">
            {item.icon}
            <div>
              <Text size="sm" fw={500}>
                {item.label}
              </Text>
              <div style={{ marginTop: "4px" }}>
                {typeof item.value === "string" ? (
                  <Text size="sm" c="dimmed">
                    {item.value}
                  </Text>
                ) : item.value &&
                  typeof item.value === "object" &&
                  "address" in item.value ? (
                  <Text size="sm" c="dimmed">
                    {item.value.address}
                  </Text>
                ) : (
                  item.value
                )}
              </div>
            </div>
          </Group>
        ))}
      </SimpleGrid>
    </Card>
  );
}
