import { useMap } from "@vis.gl/react-google-maps";
import { useUserLocationContext } from "../useUserLocationContext";
import PoorLocationAccuracyMessage from "./PoorLocationAccuracyMessage";
import { PromptStatus } from "./PromptStatus";
import { match } from "ts-pattern";
import { DeniedStatus } from "./DeniedStatus";
import { TrackingStatus } from "./TrackingStatus";
import { RequestedStatus } from "./RequestedStatus";

export default function MyLocationControls() {
  const map = useMap();
  const { status } = useUserLocationContext();

  if (!map) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 12,
        bottom: 12,
        zIndex: 1000,
      }}
    >
      {match(status)
        .with({ kind: "prompt" }, () => <PromptStatus />)
        .with({ kind: "denied" }, () => <DeniedStatus />)
        .with({ kind: "invalid_accuracy" }, () => (
          <PoorLocationAccuracyMessage />
        ))
        .with({ kind: "tracking" }, () => <TrackingStatus />)
        .with({ kind: "requested" }, () => <RequestedStatus />)
        .exhaustive()}
    </div>
  );
}
