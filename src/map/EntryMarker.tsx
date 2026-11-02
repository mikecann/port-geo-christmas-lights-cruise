import {
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import EntryMarkerPopup from "./EntryMarkerPopup";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { memo } from "react";
import { ENTRY_NUMBER_BG, EntryNumber } from "../common/components/EntryNumber";

interface EntryMarkerProps {
  entry: EntryWithFirstPhoto;
  isHovered: boolean;
  isSelected: boolean;
  // Zoomed out, the photo bubbles pile on top of each other on a phone, so
  // each house is just its number until you zoom in
  compact: boolean;
  onHover: (entryId: string) => void;
  onHoverEnd: () => void;
  onClick: (entryId: string) => void;
  onClose: () => void;
}

// Memoised so hovering one marker doesn't re-render all of them
export const EntryMarker = memo(function EntryMarker({
  entry,
  isHovered,
  isSelected,
  compact,
  onHover,
  onHoverEnd,
  onClick,
  onClose,
}: EntryMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const showPhoto = !compact || isSelected;
  // Skipped while compact, so zoomed out the map doesn't load every photo
  const photoUrl = usePhotoUrl(showPhoto ? entry.photo : null, { size: "xs" });

  const { lat, lng } = entry.entry.houseAddress;
  const entryId = entry.entry._id;

  const scale = isHovered || isSelected ? 1.2 : 1.0;
  const { entryNumber } = entry.entry;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        title={`${entry.entry.name}, number ${entryNumber}`}
        zIndex={isSelected || isHovered ? 10 : undefined}
        onClick={() => onClick(entryId)}
        onMouseEnter={() => onHover(entryId)}
        onMouseLeave={onHoverEnd}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "bottom center",
          transition: "transform 0.2s ease-in-out",
        }}
      >
        {showPhoto ? (
          <PhotoPin
            photoUrl={photoUrl}
            name={entry.entry.name}
            entryNumber={entryNumber}
          />
        ) : (
          <NumberPin entryNumber={entryNumber} />
        )}
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          pixelOffset={[0, -2]}
          onCloseClick={onClose}
          headerDisabled={true}
        >
          <EntryMarkerPopup entryId={entryId} />
        </InfoWindow>
      )}
    </>
  );
});

function Point({ size }: { size: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: -size + 2,
        left: "50%",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: `${size * 0.8}px solid transparent`,
        borderRight: `${size * 0.8}px solid transparent`,
        borderTop: `${size}px solid ${ENTRY_NUMBER_BG}`,
        zIndex: 1,
        filter: "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3))",
      }}
    />
  );
}

function NumberPin({ entryNumber }: { entryNumber: number }) {
  return (
    <div style={{ position: "relative", cursor: "pointer", marginBottom: 6 }}>
      <EntryNumber
        number={entryNumber}
        style={{
          position: "relative",
          zIndex: 2,
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
        }}
      />
      <Point size={7} />
    </div>
  );
}

function PhotoPin({
  photoUrl,
  name,
  entryNumber,
}: {
  photoUrl: string | null | undefined;
  name: string;
  entryNumber: number;
}) {
  return (
    <div style={{ position: "relative", cursor: "pointer", marginBottom: 10 }}>
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: "50%",
          border: `3px solid ${ENTRY_NUMBER_BG}`,
          background: "#0b1c3b",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          position: "relative",
          zIndex: 2,
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ fontSize: 20 }}>🎄</div>
        )}
      </div>
      <EntryNumber
        number={entryNumber}
        size="xs"
        style={{
          position: "absolute",
          bottom: -2,
          right: -10,
          zIndex: 3,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
        }}
      />
      <Point size={12} />
    </div>
  );
}
