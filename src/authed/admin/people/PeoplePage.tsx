import {
  Button,
  Card,
  Center,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { api } from "../../../../convex/_generated/api";
import type { Person } from "../../../../convex/admin/competition/users";
import { PageHeader } from "../../PageHeader";
import PersonRow from "./PersonRow";

export default function PeoplePage() {
  const admins = useQuery(api.admin.competition.users.listAdmins);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);

  return (
    <Stack gap="md">
      <PageHeader
        title="People"
        info={
          <Stack gap={6}>
            <Text size="sm">
              Everyone who has signed in to the site. Make someone an admin from
              the ⋯ on their row.
            </Text>
            <Text size="sm">
              Admins can review entries, see every vote and voter, open and
              close entries and voting, and add or remove other admins.
            </Text>
            <Text size="sm">
              Can't find someone? They need to sign in to the site once before
              they show up here.
            </Text>
          </Stack>
        }
      />

      <TextInput
        placeholder="Search by name or email"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        aria-label="Search people"
        maw={360}
      />

      {debouncedSearch ? (
        <SearchResults text={debouncedSearch} />
      ) : (
        <>
          <Section title="Admins">
            {admins === undefined ? (
              <Spinner />
            ) : (
              <PeopleTable people={admins} />
            )}
          </Section>
          <Section title="Everyone else">
            <EveryoneList />
          </Section>
        </>
      )}
    </Stack>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="xs">
      <Text fw={600}>{title}</Text>
      {children}
    </Stack>
  );
}

function Spinner() {
  return (
    <Center py="md">
      <Loader size="sm" />
    </Center>
  );
}

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <Card withBorder radius="md" padding={0}>
      <Table verticalSpacing="xs" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Person</Table.Th>
            <Table.Th>Entry</Table.Th>
            <Table.Th visibleFrom="sm">Votes</Table.Th>
            <Table.Th visibleFrom="md">Joined</Table.Th>
            <Table.Th visibleFrom="sm">Role</Table.Th>
            <Table.Th w={44} aria-label="Actions" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {people.map((person) => (
            <PersonRow key={person._id} person={person} />
          ))}
        </Table.Tbody>
      </Table>
    </Card>
  );
}

function SearchResults({ text }: { text: string }) {
  const results = useQuery(api.admin.competition.users.search, { text });
  if (results === undefined) return <Spinner />;
  if (results.length === 0)
    return (
      <Text size="sm" c="dimmed" ta="center" py="sm">
        Nobody matches "{text}".
      </Text>
    );
  return <PeopleTable people={results} />;
}

// Newest first. Admins have their own table above, so listPage leaves them out.
function EveryoneList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.competition.users.listPage,
    {},
    { initialNumItems: 25 },
  );
  if (status === "LoadingFirstPage") return <Spinner />;
  return (
    <Stack gap="xs">
      {results.length > 0 && <PeopleTable people={results} />}
      {status === "CanLoadMore" && (
        <Button
          variant="default"
          onClick={() => loadMore(50)}
          style={{ alignSelf: "flex-start" }}
        >
          Show more
        </Button>
      )}
    </Stack>
  );
}
