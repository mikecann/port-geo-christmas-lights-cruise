import { Card, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  VOTE_CATEGORIES,
  VOTE_CATEGORY_DETAILS,
} from "../../../../convex/features/votes/schema";

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
    <Card withBorder>
      <Stack gap="xs">
        <Title order={3}>{title}</Title>
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

// The two voted prizes, plus 2025's categories when looking back at 2025
export default function VoteResults({
  competitionId,
}: {
  competitionId: Id<"competitions"> | undefined;
}) {
  const results = useQuery(api.admin.competition.votes.results, {
    competitionId,
  });
  if (!results) return null;

  const legacyCategories = VOTE_CATEGORIES.filter(
    (category) => results.legacyCategories[category].length > 0,
  );
  // 2025 voted by category, so its prizes only show if a year has those votes
  const showPrizes =
    legacyCategories.length === 0 || results.peoplesChoice.length > 0;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      {showPrizes && (
        <>
          <RankingTable
            title="In-Person Favourites"
            description="Votes from people who saw the display in person."
            ranking={results.inPersonFavourites}
          />
          <RankingTable
            title="People's Choice"
            description="Every vote, in person or not."
            ranking={results.peoplesChoice}
          />
        </>
      )}
      {legacyCategories.map((category) => (
        <RankingTable
          key={category}
          title={VOTE_CATEGORY_DETAILS[category].title}
          description={`${results.year} category vote.`}
          ranking={results.legacyCategories[category]}
        />
      ))}
    </SimpleGrid>
  );
}
