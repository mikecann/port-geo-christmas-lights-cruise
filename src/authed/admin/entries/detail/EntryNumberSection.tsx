import {
  Anchor,
  Button,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useErrorCatchingMutation } from "../../../../common/errors";

// Changing the number by hand, and linking someone who entered last year
// with a different account. Give it a key that changes with the entry's
// number so the input resets.
export default function EntryNumberSection({
  entry,
}: {
  entry: Doc<"entries">;
}) {
  const [setEntryNumber, isSettingNumber] = useErrorCatchingMutation(
    api.admin.competition.entries.setEntryNumber,
  );
  const [linkPreviousEntry, isLinking] = useErrorCatchingMutation(
    api.admin.competition.entries.linkPreviousEntry,
  );
  const [newNumber, setNewNumber] = useState<string | number>(
    entry.state.entryNumber ?? "",
  );
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [previousEntryId, setPreviousEntryId] = useState<string | null>(null);
  const linkable = useQuery(
    api.admin.competition.entries.listLinkablePreviousEntries,
    isLinkOpen ? {} : "skip",
  );

  if (entry.state.kind === "rejected")
    return (
      <Text size="sm" c="dimmed">
        Rejected entries don't have a number.
      </Text>
    );

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Group gap="xs" align="flex-end">
          <NumberInput
            label="Change number"
            description="It must match their printed sign. Numbers used by another entry can't be picked."
            min={0}
            allowDecimal={false}
            allowNegative={false}
            value={newNumber}
            onChange={setNewNumber}
            w={{ base: "100%", xs: 260 }}
          />
          <Button
            variant="light"
            loading={isSettingNumber}
            disabled={
              typeof newNumber !== "number" ||
              newNumber === entry.state.entryNumber
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
      </Stack>

      {isLinkOpen ? (
        <Stack gap="xs">
          <Select
            label="Their entry from an earlier year"
            description="They'll take that entry's number, so they can reuse their sign."
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
          />
          <Group gap="xs">
            <Button
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
            <Button variant="subtle" onClick={() => setIsLinkOpen(false)}>
              Cancel
            </Button>
          </Group>
        </Stack>
      ) : (
        <Anchor
          component="button"
          type="button"
          size="sm"
          ta="left"
          onClick={() => setIsLinkOpen(true)}
        >
          Entered before with a different email? Link their earlier entry
        </Anchor>
      )}
    </Stack>
  );
}
