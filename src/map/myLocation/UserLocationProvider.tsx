import React, { useEffect, useState } from "react";
import { useErrorHandler } from "../../common/errors";
import type { Status } from "./UserLocationContext";
import { UserLocationContext } from "./UserLocationContext";

type UserLocationProviderProps = {
  children: React.ReactNode;
};

export function UserLocationProvider({ children }: UserLocationProviderProps) {
  const onError = useErrorHandler();
  const [shouldTrack, setShouldTrack] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "prompt" });
  const supportsGeolocation = "geolocation" in navigator;

  useEffect(() => {
    if (!shouldTrack) return;
    if (status.kind !== "requested")
      queueMicrotask(() =>
        setStatus({
          kind: "requested",
        }),
      );

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (position.coords.accuracy > 200) {
          setStatus({
            kind: "invalid_accuracy",
            position,
          });
          setShouldTrack(false);
          return;
        }

        setStatus({
          kind: "tracking",
          position,
        });
      },
      (error) => {
        // Ignore this specific iOS quirk
        if (error.code == 2) return;
        setStatus({
          kind: error.code === 1 ? "denied" : "prompt",
        });
        setShouldTrack(false);
        onError(`${error.code}: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      },
    );
    queueMicrotask(() => setWatchId(watchId));
  }, [shouldTrack, status.kind, onError]);

  useEffect(() => {
    if (!watchId) return;
    return () => navigator.geolocation.clearWatch(watchId);
  }, [watchId]);

  return (
    <UserLocationContext.Provider
      value={{
        status,
        startTracking: () => {
          if (!supportsGeolocation)
            return onError(`Geolocation is not supported by this browser`);

          setShouldTrack(true);
        },
        stopTracking: () => setShouldTrack(false),
      }}
    >
      {children}
    </UserLocationContext.Provider>
  );
}
