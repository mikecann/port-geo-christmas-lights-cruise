import {
  Badge,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AdminEntry } from "../../../../convex/admin/competition/entries";
import { useErrorCatchingMutation } from "../../../common/errors";

// Whether they're a returning entrant, and the tools to fix a number by hand.
// Give it a key that changes with the entry's number so the input resets.
export default function EntryNumberSection({ entry }: { entry: AdminEntry }) {
  const [setEntryNumber, isSettingNumber] = useErrorCatchingMutation(
    api.admin.competition.entries.setEntryNumber,
  );
  const [linkPreviousEntry, isLinking] = useErrorCatchingMutation(
    api.admin.competition.entries.linkPreviousEntry,
  );
  const [newNumber, setNewNumber] = useState<string | number>(
    entry.entryNumber ?? "",
  );
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [previousEntryId, setPreviousEntryId] = useState<string | null>(null);
  const linkable = useQuery(
    api.admin.competition.entries.listLinkablePreviousEntries,
    isLinkOpen ? {} : "skip",
  );
  const canChange = entry.status !== "rejected";

  return (
    <Stack gap="xs">
      <Group gap="xs">
        <Text size="sm" fw={500}>
          Entry number:
        </Text>
        <Text size="sm">
          {canChange
            ? entry.entryNumber === undefined
              ? "Given on approval"
              : `#${entry.entryNumber}`
            : "None, the entry was rejected"}
        </Text>
        {entry.isNumberOutsideRange && (
          <Badge
            color="orange"
            variant="light"
            leftSection={<IconAlertTriangle size={12} />}
          >
            Outside the number range
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        {entry.previous
          ? `Returning entrant: #${entry.previous.entryNumber} in ${entry.previous.year} (${entry.previous.name})`
          : "New entrant: no approved entry in earlier years"}
      </Text>

      {canChange && (
        <Group gap="xs" align="flex-end">
          <NumberInput
            size="xs"
            label="Change number"
            min={0}
            allowDecimal={false}
            allowNegative={false}
            value={newNumber}
            onChange={setNewNumber}
            w={130}
          />
          <Button
            size="xs"
            variant="light"
            loading={isSettingNumber}
            disabled={
              typeof newNumber !== "number" || newNumber === entry.entryNumber
            }
            onClick={() => {
              if (typeof newNumber === "number")
                void setEntryNumber({
                  entryId: entry._id,
                  entryNumber: newNumber,
                });
            }}
          >
            Save number
          </Button>
        </Group>
      )}

      {canChange &&
        (isLinkOpen ? (
          <Group gap="xs" align="flex-end">
            <Select
              size="xs"
              label="Same person's entry from an earlier year"
              placeholder={
                linkable ? "Search by name, address or number" : "Loading..."
              }
              searchable
              nothingFoundMessage="No matching entries"
              data={(linkable ?? []).map((previous) => ({
                value: previous._id,
                label: `${previous.year} #${previous.entryNumber}: ${previous.name}, ${previous.address}${previous.submitterEmail ? ` (${previous.submitterEmail})` : ""}`,
              }))}
              value={previousEntryId}
              onChange={setPreviousEntryId}
              style={{ flex: 1 }}
            />
            <Button
              size="xs"
              variant="light"
              loading={isLinking}
              disabled={!previousEntryId}
              onClick={() => {
                if (!previousEntryId) return;
                void linkPreviousEntry({
                  entryId: entry._id,
                  previousEntryId: previousEntryId as Id<"entries">,
                }).then((linked) => {
                  if (linked) setIsLinkOpen(false);
                });
              }}
            >
              Link and use their number
            </Button>
          </Group>
        ) : (
          <Button
            size="xs"
            variant="subtle"
            w="fit-content"
            px={0}
            onClick={() => setIsLinkOpen(true)}
          >
            Signed in with a different account? Link to their earlier entry
          </Button>
        ))}
    </Stack>
  );
}
