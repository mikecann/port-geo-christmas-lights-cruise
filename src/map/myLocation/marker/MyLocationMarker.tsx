import React from "react";
import {
  AdvancedMarker,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import { useUserLocationContext } from "../useUserLocationContext";
import { Circle } from "./Circle";

export default function MyLocationMarker() {
  const [markerRef] = useAdvancedMarkerRef();
  const { status } = useUserLocationContext();

  if (status.kind !== "tracking") return null;

  const { accuracy, latitude, longitude } = status.position.coords;

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{
        lat: latitude,
        lng: longitude,
      }}
      style={{ position: "relative" }}
    >
      {accuracy && accuracy < 500 && (
        <Circle
          radius={accuracy ?? 0}
          center={{
            lat: latitude,
            lng: longitude,
          }}
          strokeColor={"#285eb5"}
          strokeOpacity={1}
          strokeWeight={2}
          fillColor={"#3b82f6"}
          fillOpacity={0.25}
          clickable={false}
        />
      )}
      <div
        style={{
          width: "25px",
          height: "25px",
          borderRadius: "50%",
          border: "2px solid #4285f4",
          background: "white",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
          position: "relative",
          transform: "translate(0%, 50%)",
          zIndex: 2,
        }}
      >
        <div
          style={{
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            backgroundColor: "#4285f4",
          }}
        />
      </div>
    </AdvancedMarker>
  );
}
