import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { InfoTip } from "../AdminLayout";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Ranking = FunctionReturnType<
  typeof api.admin.competition.votes.results
>["peoplesChoice"];

const votesLabel = (count: number) =>
  `${count} ${count === 1 ? "vote" : "votes"}`;

function RankingTable({
  title,
  description,
  ranking,
}: {
  title: string;
  description: string;
  ranking: Ranking;
}) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <Title order={3} fz="lg">
              {title}
            </Title>
            <InfoTip>{description}</InfoTip>
          </Group>
          <Text size="sm" c="dimmed">
            {votesLabel(ranking.reduce((total, row) => total + row.votes, 0))}
          </Text>
        </Group>
        {ranking.length === 0 ? (
          <Text size="sm" c="dimmed">
            No votes yet.
          </Text>
        ) : (
          <Table verticalSpacing={6}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>#</Table.Th>
                <Table.Th>Entry</Table.Th>
                <Table.Th ta="right">Votes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranking.map((row) => (
                <Table.Tr key={row.entryId}>
                  <Table.Td c="dimmed">{row.rank}</Table.Td>
                  <Table.Td>
                    <Text span c="dimmed" size="sm">
                      #{row.entryNumber}
                    </Text>{" "}
                    {row.entryName}
                  </Table.Td>
                  <Table.Td ta="right">{row.votes}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    </Card>
  );
}

// The three voted prizes. 2025 voted on best display without the in-person
// check, so its year shows that ranking in place of the first two.
export default function VoteResults({
  competitionId,
}: {
  competitionId: Id<"competitions"> | undefined;
}) {
  const results = useQuery(api.admin.competition.votes.results, {
    competitionId,
  });
  if (!results) return null;

  const isLegacyYear =
    results.legacyBestDisplay.length > 0 &&
    results.inPersonFavourites.length === 0 &&
    results.peoplesChoice.length === 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
      {isLegacyYear ? (
        <RankingTable
          title="Best Display"
          description={`${results.year} category vote.`}
          ranking={results.legacyBestDisplay}
        />
      ) : (
        <>
          <RankingTable
            title="In-Person Favourites"
            description="Best display votes from people who said they saw it in person, from a connection in the in-person area."
            ranking={results.inPersonFavourites}
          />
          <RankingTable
            title="People's Choice"
            description="Best display votes from everyone else. Flagged votes count here."
            ranking={results.peoplesChoice}
          />
        </>
      )}
      <RankingTable
        title="Most Jolly"
        description={
          isLegacyYear
            ? `${results.year} category vote.`
            : "Votes from people who saw the display in person, for dancing, dressing up and festive fun."
        }
        ranking={results.mostJolly}
      />
    </SimpleGrid>
  );
}
