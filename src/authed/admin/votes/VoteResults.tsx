import { Card, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type Ranking = FunctionReturnType<
  typeof api.admin.competition.votes.results
>["peoplesChoice"];

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
        <Title order={3} fz="lg">
          {title}
        </Title>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
        {ranking.length === 0 ? (
          <Text size="sm" c="dimmed">
            No votes yet.
          </Text>
        ) : (
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Place</Table.Th>
                <Table.Th>Entry</Table.Th>
                <Table.Th ta="right">Votes</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {ranking.map((row) => (
                <Table.Tr key={row.entryId}>
                  <Table.Td>{row.rank}</Table.Td>
                  <Table.Td>
                    #{row.entryNumber} {row.entryName}
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
