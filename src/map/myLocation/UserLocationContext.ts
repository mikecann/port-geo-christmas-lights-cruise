import { createContext } from "react";

export interface UserLocationContextType {
  status: Status;
  startTracking: () => void;
  stopTracking: () => void;
}

export const UserLocationContext =
  createContext<UserLocationContextType | null>(null);

export type Status =
  | {
      kind: "prompt";
    }
  | {
      kind: "requested";
    }
  | {
      kind: "tracking";
      position: GeolocationPosition;
    }
  | {
      kind: "invalid_accuracy";
      position: GeolocationPosition;
    }
  | {
      kind: "denied";
    };
