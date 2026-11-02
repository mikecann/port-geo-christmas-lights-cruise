import * as React from "react";
import { IconCurrentLocation } from "@tabler/icons-react";
import { useUserLocationContext } from "../useUserLocationContext";
import { LocateButton } from "./LocateButton";

export const PromptStatus: React.FC = () => {
  const { startTracking } = useUserLocationContext();
  return (
    <LocateButton label="Show where I am" onClick={() => startTracking()}>
      <IconCurrentLocation size={22} />
    </LocateButton>
  );
};
