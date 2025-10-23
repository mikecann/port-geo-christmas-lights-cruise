import { Box } from "@mantine/core";
import type { EntryWithFirstPhoto } from "../../convex/public/entries";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { routes } from "../routes";
import { useState } from "react";
import styles from "./HomeEntryMarker.module.css";

interface HomeEntryMarkerProps {
  entry: EntryWithFirstPhoto;
  position: { x: string; y: string };
}

export function HomeEntryMarker({ entry, position }: HomeEntryMarkerProps) {
  const photoUrl = usePhotoUrl(entry.photo, { size: "xs" });
  const [isHovered, setIsHovered] = useState(false);
  const entryNumber =
    entry.entry.status === "approved" ? entry.entry.entryNumber : null;

  const scale = isHovered ? 1.2 : 1;

  return (
    <Box className="home-entry-marker-wrapper">
      <Box
        component="a"
        {...routes.entry({ entryId: entry.entry._id }).link}
        className={styles.container}
        style={{
          position: "absolute",
          left: position.x,
          top: position.y,
          transform: "translate(-50%, -100%)",
          cursor: "pointer",
          textDecoration: "none",
          zIndex: 10,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Box
          className={styles.animatedContent}
          style={{
            ["--scale" as string]: scale,
          }}
        >
          <div
            style={{
              position: "relative",
            }}
          >
            {/* Main circular marker */}
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                border: "3px solid #228be6",
                background: "white",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
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
                <div style={{ color: "#228be6", fontSize: "24px" }}>🎄</div>
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
                  borderRadius: "14px",
                  padding: "0px 4px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.4)",
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
                bottom: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "0",
                height: "0",
                borderLeft: "12px solid transparent",
                borderRight: "12px solid transparent",
                borderTop: "14px solid #228be6",
                zIndex: 1,
                filter: "drop-shadow(0 3px 5px rgba(0, 0, 0, 0.3))",
              }}
            />
          </div>
        </Box>
      </Box>
    </Box>
  );
}
