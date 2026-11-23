import {
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { UnstyledButton, Stack, Text, Group } from "@mantine/core";
import { memo } from "react";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";
import {
  ENTRY_NUMBER_BG,
  ENTRY_NUMBER_FG,
  EntryNumber,
} from "../common/components/EntryNumber";

interface EntryGroupMarkerProps {
  groupKey: string;
  lat: number;
  lng: number;
  entries: EntryWithFirstPhoto[];
  listOpen: boolean;
  onClick: (groupKey: string) => void;
  onPick: (entryId: string) => void;
  onCloseList: () => void;
}

// Several houses too close together to tap apart at this zoom. Tapping zooms
// in until they split; houses that never split (next door at the most zoomed
// in) get a list to pick from instead.
export const EntryGroupMarker = memo(function EntryGroupMarker({
  groupKey,
  lat,
  lng,
  entries,
  listOpen,
  onClick,
  onPick,
  onCloseList,
}: EntryGroupMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const numbers = entries.map((e) => `#${e.entry.entryNumber}`).join(", ");

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        title={`${entries.length} houses here: ${numbers}`}
        zIndex={listOpen ? 10 : 5}
        onClick={() => onClick(groupKey)}
        // Centred on the houses rather than standing on them like a pin
        anchorLeft="-50%"
        anchorTop="-50%"
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: ENTRY_NUMBER_FG,
            border: `3px solid ${ENTRY_NUMBER_BG}`,
            boxShadow:
              "0 0 0 4px rgba(251, 175, 93, 0.35), 0 2px 8px rgba(0, 0, 0, 0.4)",
            color: ENTRY_NUMBER_BG,
            fontWeight: 800,
            fontSize: 17,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {entries.length}
        </div>
      </AdvancedMarker>

      {listOpen && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onCloseList}
          headerDisabled={true}
        >
          {/* Google draws this on white, so the colours suit a light
              background */}
          <Stack gap={2} w={220} maw="70vw" p={2}>
            <Text size="xs" c="gray.7" px={6} pt={4} pb={2}>
              {entries.length} houses right next to each other
            </Text>
            {entries.map((e) => (
              <UnstyledButton
                key={e.entry._id}
                onClick={() => onPick(e.entry._id)}
                px={6}
                mih={44}
                style={{ borderRadius: 6 }}
              >
                <Group gap="xs" wrap="nowrap">
                  <EntryNumber number={e.entry.entryNumber} />
                  <Text size="sm" fw={600} c="dark.8" lineClamp={1}>
                    {e.entry.name}
                  </Text>
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </InfoWindow>
      )}
    </>
  );
});
