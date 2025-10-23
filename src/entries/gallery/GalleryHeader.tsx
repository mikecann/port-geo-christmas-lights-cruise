import { Stack, Group, Title, Text, Button, Box } from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { routes } from "../../routes";

export default function GalleryHeader() {
  return (
    <Box
      style={{
        background:
          "linear-gradient(135deg, #0b1c3b 0%, #1a2744 50%, #0b1c3b 100%)",
        borderRadius: "var(--mantine-radius-lg)",
        padding: "3rem 2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 50%, rgba(251, 175, 93, 0.1) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
      <Stack gap="lg" align="center" style={{ position: "relative" }}>
        <Group gap="sm" justify="center">
          <IconTrophy size={32} color="#FBAF5D" />
          <Title order={1} ta="center" c="white" size="2.5rem">
            Christmas Lights Competition Entries
          </Title>
        </Group>
        <Text size="xl" c="gray.3" ta="center" maw={700} fw={400}>
          Discover the amazing Christmas light displays participating in the
          Port Geographe Christmas Cruise 2025 competition.
        </Text>
        <Button
          component="a"
          {...routes.competitionDetails().link}
          leftSection={<IconTrophy size={18} />}
          variant="filled"
          size="lg"
          color="#FBAF5D"
          styles={{
            root: {
              backgroundColor: "#FBAF5D",
              color: "#0b1c3b",
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "#e09d4a",
              },
            },
          }}
        >
          View Competition Details & Prizes
        </Button>
      </Stack>
    </Box>
  );
}
