import {
  Stack,
  Group,
  Title,
  Text,
  Button,
  Box,
  SegmentedControl,
} from "@mantine/core";
import { IconTrophy } from "@tabler/icons-react";
import { routes } from "../../routes";

type Props = {
  competitionYear: number;
  availableYears: number[];
  onCompetitionYearChange: (year: number) => void;
};

export default function GalleryHeader({
  competitionYear,
  availableYears,
  onCompetitionYearChange,
}: Props) {
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
          {competitionYear === 2026
            ? "Discover the displays joining the 2026 Port Geographe Christmas Lights competition."
            : `Browse the preserved ${competitionYear} competition entries and results.`}
        </Text>
        <SegmentedControl
          aria-label="Competition year"
          value={`${competitionYear}`}
          onChange={(value) => onCompetitionYearChange(Number(value))}
          data={availableYears.map((year) => ({
            value: `${year}`,
            label: year === 2026 ? `${year} Current` : `${year} Archive`,
          }))}
          color="#FBAF5D"
        />
        {competitionYear === 2026 ? (
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
        ) : null}
      </Stack>
    </Box>
  );
}
