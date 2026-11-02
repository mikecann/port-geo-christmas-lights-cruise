import { measured } from "../../analytics/client";
import { Alert, Card, Stack, Button, TextInput, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { useDebounce } from "use-debounce";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useConfirmation } from "../../common/components/confirmation/useConfirmation";
import { useErrorHandler, useErrorCatchingMutation } from "../../common/errors";
import PhotoSection from "./photos/PhotoSection";
import AddressAutocomplete from "../../common/components/AddressAutocomplete";
import {
  MAX_ENTRY_ADDRESS_LENGTH,
  MAX_ENTRY_NAME_LENGTH,
} from "../../../shared/constants";
import DraftEntryHeader from "./DraftEntryHeader";
import { iife } from "../../../shared/misc";
import EntryNameLabel from "./EntryNameLabel";
import type { PreviousEntry } from "./PreviousEntrySection";

interface DraftEntryStateProps {
  entry: Doc<"entries">;
  previous: PreviousEntry | null | undefined;
}

export default function DraftEntryState({
  entry,
  previous,
}: DraftEntryStateProps) {
  const [updateEntry, isSaving] = useErrorCatchingMutation(
    api.my.entries.updateDraft,
  );
  const removeEntry = useMutation(api.my.entries.remove);
  const submitMyEntry = useAction(api.my.entries.submit);
  const photos = useQuery(api.my.photos.list) ?? [];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotosUploading, setIsPhotosUploading] = useState(false);
  const { confirm } = useConfirmation();
  const onApiError = useErrorHandler();
  // Errors wait until someone has left the field or tried to send it in, so
  // the form doesn't open covered in red
  const [addressTouched, setAddressTouched] = useState(false);
  const [triedToSubmit, setTriedToSubmit] = useState(false);

  // Form state
  const [name, setName] = useState(() => entry.state.name || "");
  const [address, setAddress] = useState(
    () => entry.state.houseAddress?.address ?? "",
  );
  const [selectedAddress, setSelectedAddress] = useState<
    { address: string; placeId: string } | undefined
  >(() =>
    entry.state.kind === "draft" ? entry.state.houseAddress : undefined,
  );

  // Debounce form values for auto-save
  const [debouncedName] = useDebounce(name, 500);

  // Track if this is the first render to avoid saving on mount
  const isFirstRender = useRef(true);

  // // Auto-save effect
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    updateEntry({
      houseAddress: selectedAddress,
      name: debouncedName,
    });
  }, [debouncedName, selectedAddress, updateEntry]);

  const hasAddress = !!selectedAddress?.placeId;
  const hasName = !!name.trim();
  // The machine's hasAddress and hasName guards refuse it without both
  const missing = iife(() => {
    if (hasAddress && hasName) return null;
    if (hasName) return "Pick your address from the list to send it in";
    if (hasAddress) return "Add a name to send it in";
    return "Add your address and a name to send it in";
  });
  const isKeepingNumber =
    entry.previousEntryId !== undefined &&
    entry.state.entryNumber !== undefined;

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Stack gap="md">
        <DraftEntryHeader
          entry={entry}
          name={name}
          isSaving={isSaving}
          previousYear={isKeepingNumber ? previous?.year : undefined}
          onRemove={async () => {
            const confirmed = await confirm({
              title: "Remove Entry",
              content:
                "Are you sure you want to remove your entry from the Christmas lights competition? This action cannot be undone.",
              confirmButton: "Remove Entry",
              confirmButtonColor: "red",
            });

            if (!confirmed) return;

            removeEntry().catch(onApiError);
          }}
        />

        {entry.previousEntryId && (
          <Alert color="blue" variant="light" title="Welcome back!">
            We've filled in your name and address from{" "}
            {previous ? previous.year : "last time"}. Photos don't carry over,
            so please add new photos of this year's display.
            {/* The number shows in the header when it's kept, so it's only
                  spelled out here when it's gone */}
            {!isKeepingNumber && previous && (
              <>
                {" "}
                #{previous.entry.entryNumber} has gone to someone else this
                year, so you'll get a new number and sign.
              </>
            )}
          </Alert>
        )}

        {/* Form */}
        <Stack gap="md">
          {/* AddressAutocomplete has no onBlur of its own, and blur
                bubbles in React, so this wrapper hears its input leave */}
          <div onBlur={() => setAddressTouched(true)}>
            <AddressAutocomplete
              label="House address"
              placeholder="Start typing your address"
              required
              value={address}
              onChange={(value) => {
                setAddress(value);
                // Once the text is edited it's no longer the address that
                // was picked, so drop it rather than save the old one
                if (selectedAddress && value !== selectedAddress.address)
                  setSelectedAddress(undefined);
              }}
              maxLength={MAX_ENTRY_ADDRESS_LENGTH}
              onSelect={(val) => setSelectedAddress(val)}
              error={
                hasAddress || !(addressTouched || triedToSubmit)
                  ? null
                  : "Pick your address from the list"
              }
            />
          </div>
          <TextInput
            label={<EntryNameLabel />}
            placeholder="Give your display a festive name"
            required
            value={name}
            maxLength={MAX_ENTRY_NAME_LENGTH}
            onChange={(e) => setName(e.currentTarget.value)}
            error={triedToSubmit && !hasName ? "Add a name" : null}
          />

          {/* Photo Section */}
          <PhotoSection
            photos={photos}
            canUpload={true}
            canRemove={true}
            showAddLaterHint
            onUploadStateChange={setIsPhotosUploading}
          />
        </Stack>

        {/* Stays tappable while something's missing, so a tap shows what
              to fix on the fields instead of doing nothing */}
        <Stack gap={6}>
          <Button
            size="lg"
            disabled={isPhotosUploading}
            loading={isSubmitting}
            onClick={() => {
              if (missing) {
                setTriedToSubmit(true);
                return;
              }
              setIsSubmitting(true);
              measured(() => submitMyEntry(), "entry_submit", {
                entry_id: entry._id,
                competition_id: entry.competitionId,
              })
                .then(() =>
                  notifications.show({
                    title: "Sent in",
                    message: "We'll email you once it's been reviewed.",
                    color: "green",
                    icon: <IconCheck size={16} />,
                  }),
                )
                .catch(onApiError)
                .finally(() => setIsSubmitting(false));
            }}
          >
            {isPhotosUploading
              ? "Waiting for photos to upload…"
              : "Send in my entry"}
          </Button>
          {missing && !isPhotosUploading && (
            <Text size="sm" c="dimmed" ta="center">
              {missing}
            </Text>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}
