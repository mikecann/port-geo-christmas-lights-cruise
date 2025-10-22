import { Card, Stack, Button, TextInput, Divider } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { useDebounce } from "use-debounce";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { getAddressString } from "../../../shared/misc";
import { useConfirmation } from "../../common/components/confirmation/useConfirmation";
import {
  useApiErrorHandler,
  useErrorCatchingMutation,
} from "../../common/errors";
import PhotoSection from "./photos/PhotoSection";
import AddressAutocomplete from "../../common/components/AddressAutocomplete";
import DraftEntryHeader from "./DraftEntryHeader";
import DraftEntryAlert from "./DraftEntryAlert";

interface DraftEntryStateProps {
  entry: Doc<"entries">;
}

export default function DraftEntryState({ entry }: DraftEntryStateProps) {
  const [updateEntry, isSaving] = useErrorCatchingMutation(
    api.my.entries.updateDraft,
  );
  const removeEntry = useMutation(api.my.entries.remove);
  const submitMyEntry = useAction(api.my.entries.submit);
  const photos = useQuery(api.my.photos.list) ?? [];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPhotosUploading, setIsPhotosUploading] = useState(false);
  const { confirm } = useConfirmation();
  const onApiError = useApiErrorHandler();

  // Form state
  const [name, setName] = useState(() => entry.name || "");
  const [address, setAddress] = useState(() =>
    getAddressString(entry.houseAddress),
  );
  const [selectedAddress, setSelectedAddress] = useState<
    { address: string; placeId: string } | undefined
  >(() =>
    typeof entry.houseAddress === "object" && entry.status === "draft"
      ? entry.houseAddress
      : undefined,
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

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <DraftEntryHeader
            entry={entry}
            isSaving={isSaving}
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

          <DraftEntryAlert />

          {/* Form */}
          <Stack gap="md">
            <AddressAutocomplete
              label="House Address"
              placeholder="Enter your house address"
              required
              value={address}
              onChange={setAddress}
              onSelect={(val) => setSelectedAddress(val)}
              error={
                selectedAddress?.placeId
                  ? null
                  : "Select an address from the list"
              }
            />
            <TextInput
              label="Entry Name"
              placeholder="Give your display a name (optional)"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            {/* Photo Section */}
            <PhotoSection
              photos={photos}
              canUpload={true}
              canRemove={true}
              onUploadStateChange={setIsPhotosUploading}
            />
          </Stack>

          <Divider />

          {/* Submit button */}
          <Button
            size="lg"
            disabled={!selectedAddress || isPhotosUploading}
            loading={isSubmitting}
            onClick={() => {
              setIsSubmitting(true);
              submitMyEntry()
                .then(() =>
                  notifications.show({
                    title: "Submitted!",
                    message: "Your entry has been submitted for admin review.",
                    color: "green",
                    icon: <IconCheck size={16} />,
                  }),
                )
                .catch(onApiError)
                .finally(() => setIsSubmitting(false));
            }}
          >
            {isPhotosUploading
              ? "Wait for photos to finish uploading..."
              : "Submit Entry for Review"}
          </Button>
        </Stack>
      </Card>
    </>
  );
}
