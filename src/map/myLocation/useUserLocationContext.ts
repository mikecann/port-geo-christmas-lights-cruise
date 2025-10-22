import { useContext } from "react";
import { UserLocationContext } from "./UserLocationContext";

export function useUserLocationContext() {
  const context = useContext(UserLocationContext);
  if (!context)
    throw new Error(
      "useUserLocationContext must be used within UserLocationProvider",
    );

  return context;
}
