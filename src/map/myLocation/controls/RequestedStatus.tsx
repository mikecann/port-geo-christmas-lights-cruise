import * as React from "react";
import { IconCurrentLocation } from "@tabler/icons-react";
import { LocateButton } from "./LocateButton";

// Waiting for the browser to ask, or for the first fix
export const RequestedStatus: React.FC = () => (
  <LocateButton label="Finding where you are" loading>
    <IconCurrentLocation size={22} />
  </LocateButton>
);
