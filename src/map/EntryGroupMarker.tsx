import {
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { UnstyledButton, Stack, Text, Group } from "@mantine/core";
import { memo } from "react";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";
import { IconHome } from "@tabler/icons-react";
import { RAISED_PIN, stackOrder } from "./groupPins";
import { Point, TapArea } from "./EntryMarker";
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
        zIndex={listOpen ? RAISED_PIN : stackOrder(lat)}
        onClick={() => onClick(groupKey)}
      >
        {/* The same size as a house's number pin, so a group never covers
            more of the map than the pins it stands for. Dark with a
            second pill behind it, so it reads as a stack, not a house. */}
        <TapArea>
          <div style={{ position: "relative", marginBottom: 6 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                transform: "translate(4px, -4px)",
                borderRadius: 999,
                background: ENTRY_NUMBER_FG,
                border: `2px solid ${ENTRY_NUMBER_BG}`,
                opacity: 0.7,
              }}
            />
            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "1px 8px",
                borderRadius: 999,
                background: ENTRY_NUMBER_FG,
                border: `2px solid ${ENTRY_NUMBER_BG}`,
                color: ENTRY_NUMBER_BG,
                fontWeight: 800,
                fontSize: 13,
                lineHeight: 1.3,
                fontVariantNumeric: "tabular-nums",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
              }}
            >
              <IconHome size={13} stroke={2.5} />
              {entries.length}
            </div>
            <Point size={7} />
          </div>
        </TapArea>
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
