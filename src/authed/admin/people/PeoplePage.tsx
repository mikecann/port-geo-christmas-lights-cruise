import {
  Button,
  Card,
  Center,
  Loader,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { api } from "../../../../convex/_generated/api";
import { AdminPageHeader } from "../AdminLayout";
import PersonRow from "./PersonRow";

export default function PeoplePage() {
  const admins = useQuery(api.admin.competition.users.listAdmins);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search.trim(), 300);

  return (
    <Stack gap="xl">
      <AdminPageHeader
        title="People"
        description="Everyone who has signed in to the site. Make someone an admin here once they've signed in."
      />

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Stack gap={2}>
            <Text fw={600}>Admins</Text>
            <Text size="sm" c="dimmed">
              Admins can review entries, see every vote and voter, open and
              close entries and voting, and add or remove other admins.
            </Text>
          </Stack>
          {admins === undefined ? (
            <Center py="md">
              <Loader size="sm" />
            </Center>
          ) : (
            admins.map((person) => (
              <PersonRow key={person._id} person={person} />
            ))
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="sm">
          <Stack gap={2}>
            <Text fw={600}>Everyone</Text>
            <Text size="sm" c="dimmed">
              Can't find someone? They need to sign in to the site once before
              they show up here.
            </Text>
          </Stack>
          <TextInput
            placeholder="Search by name or email"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            aria-label="Search people"
          />
          {debouncedSearch ? (
            <SearchResults text={debouncedSearch} />
          ) : (
            <EveryoneList />
          )}
        </Stack>
      </Card>
    </Stack>
  );
}

function SearchResults({ text }: { text: string }) {
  const results = useQuery(api.admin.competition.users.search, { text });
  if (results === undefined)
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  if (results.length === 0)
    return (
      <Text size="sm" c="dimmed" ta="center" py="sm">
        Nobody matches "{text}".
      </Text>
    );
  return results.map((person) => (
    <PersonRow key={person._id} person={person} />
  ));
}

// Newest first
function EveryoneList() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.admin.competition.users.listPage,
    {},
    { initialNumItems: 25 },
  );
  return (
    <>
      {results.map((person) => (
        <PersonRow key={person._id} person={person} />
      ))}
      {status === "LoadingFirstPage" && (
        <Center py="md">
          <Loader size="sm" />
        </Center>
      )}
      {status === "CanLoadMore" && (
        <Button variant="light" onClick={() => loadMore(50)}>
          Show more
        </Button>
      )}
    </>
  );
}
