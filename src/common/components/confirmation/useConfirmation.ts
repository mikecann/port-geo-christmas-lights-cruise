import { useContext } from "react";
import { ConfirmationContext } from "./ConfirmationContext";

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context)
    throw new Error(
      "useConfirmation must be used within a ConfirmationProvider",
    );

  return context;
}
