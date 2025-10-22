import {
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import EntryMarkerPopup from "./EntryMarkerPopup";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";

interface EntryMarkerProps {
  entry: EntryWithFirstPhoto;
  isHovered: boolean;
  isSelected: boolean;
  onHover: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
}

export function EntryMarker({
  entry,
  isHovered,
  isSelected,
  onHover,
  onHoverEnd,
  onClick,
}: EntryMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const photoUrl = usePhotoUrl(entry.photo, { size: "xs" }); // Small thumbnails for map markers

  // Handle the case where houseAddress might be a string or undefined
  if (!entry.entry.houseAddress || typeof entry.entry.houseAddress === "string")
    return null;

  const { lat, lng } = entry.entry.houseAddress;

  const scale = isHovered || isSelected ? 1.2 : 1.0;
  const entryNumber =
    entry.entry.status === "approved" ? entry.entry.entryNumber : null;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat, lng }}
        onClick={onClick}
        onMouseEnter={onHover}
        onMouseLeave={onHoverEnd}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "bottom center",
          transition: "transform 0.2s ease-in-out",
        }}
      >
        <div
          style={{
            position: "relative",
            cursor: "pointer",
          }}
        >
          {/* Main circular marker */}
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              border: "3px solid #228be6",
              background: "white",
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
                alt={entry.entry.name}
                loading="lazy"
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div style={{ color: "#228be6", fontSize: "20px" }}>🎄</div>
            )}
          </div>

          {/* Entry number badge */}
          {entryNumber !== null && (
            <div
              style={{
                position: "absolute",
                bottom: "2px",
                right: "-2px",
                backgroundColor: "#228be6",
                color: "white",
                borderRadius: "12px",
                padding: "2px 6px",
                fontSize: "11px",
                fontWeight: "bold",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
                zIndex: 3,
                border: "2px solid white",
              }}
            >
              #{entryNumber}
            </div>
          )}

          {/* Triangular point */}
          <div
            style={{
              position: "absolute",
              bottom: "-8px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "0",
              height: "0",
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "12px solid #228be6",
              zIndex: 1,
              filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))",
            }}
          />
        </div>
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          pixelOffset={[0, -2]}
          onCloseClick={() => onClick()}
          headerDisabled={true}
        >
          <EntryMarkerPopup entryId={entry.entry._id} />
        </InfoWindow>
      )}
    </>
  );
}
