import { Text, Stack, Group, Card, Avatar, SimpleGrid } from "@mantine/core";
import {
  IconMail,
  IconPhone,
  IconCalendar,
  IconUser,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

interface UserDetailsSectionProps {
  userId: Id<"users">;
}

export default function UserDetailsSection({
  userId,
}: UserDetailsSectionProps) {
  const user = useQuery(api.admin.competition.entries.getUserDetails, {
    userId,
  });

  if (!user)
    return (
      <Card withBorder p="md">
        <Text fw={500} mb="md">
          User Details
        </Text>
        <Text size="sm" c="dimmed">
          Loading user information...
        </Text>
      </Card>
    );

  if (!user)
    return (
      <Card withBorder p="md">
        <Text fw={500} mb="md">
          User Details
        </Text>
        <Text size="sm" c="dimmed">
          User information not available
        </Text>
      </Card>
    );

  const userItems = [
    {
      icon: <Avatar src={user.image} size="sm" radius="xl" />,
      label: "Name",
      value: user.name || "No name provided",
    },
    ...(user.email
      ? [
          {
            icon: <IconMail size={16} color="gray" />,
            label: (
              <>
                Email
                {user.emailVerificationTime && (
                  <IconShieldCheck
                    size={12}
                    color="green"
                    style={{ marginLeft: 4, display: "inline" }}
                  />
                )}
              </>
            ),
            value: (
              <>
                {user.email}
                {user.emailVerificationTime && (
                  <Text size="xs" c="green" span style={{ marginLeft: 4 }}>
                    (verified)
                  </Text>
                )}
              </>
            ),
          },
        ]
      : []),
    ...(user.phone
      ? [
          {
            icon: <IconPhone size={16} color="gray" />,
            label: (
              <>
                Phone
                {user.phoneVerificationTime && (
                  <IconShieldCheck
                    size={12}
                    color="green"
                    style={{ marginLeft: 4, display: "inline" }}
                  />
                )}
              </>
            ),
            value: (
              <>
                {user.phone}
                {user.phoneVerificationTime && (
                  <Text size="xs" c="green" span style={{ marginLeft: 4 }}>
                    (verified)
                  </Text>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      icon: <IconCalendar size={16} color="gray" />,
      label: "Joined",
      value: `${new Date(user._creationTime).toLocaleDateString()} at ${new Date(user._creationTime).toLocaleTimeString()}`,
    },
  ];

  return (
    <Card withBorder p="md">
      <Text fw={500} mb="md">
        User Details
      </Text>
      <SimpleGrid cols={2} spacing="md" verticalSpacing="md">
        {userItems.map((item, index) => (
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
                ) : (
                  <Text size="sm" c="dimmed">
                    {item.value}
                  </Text>
                )}
              </div>
            </div>
          </Group>
        ))}
      </SimpleGrid>
    </Card>
  );
}
