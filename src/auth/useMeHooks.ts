import { useContext } from "react";
import { MeContext } from "./MeContext";

export function useMe() {
  const context = useContext(MeContext);
  if (context === undefined)
    throw new Error("useMe must be used within a MeProvider");

  return context.me;
}

export const useIsSystemAdmin = () => {
  const me = useMe();
  return me?.isSystemAdmin;
};

export const useIsCompetitionAdmin = () => {
  const me = useMe();
  return me?.isCompetitionAdmin;
};
