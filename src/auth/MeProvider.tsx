import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MeContext } from "./MeContext";
import { useForgetSentCodeOnSignInOrOut } from "./sentCode";

interface MeProviderProps {
  children: ReactNode;
}

export function MeProvider({ children }: MeProviderProps) {
  const me = useQuery(api.public.user.find);
  const isLoading = me === undefined;
  useForgetSentCodeOnSignInOrOut();

  return (
    <MeContext.Provider value={{ me, isLoading }}>
      {children}
    </MeContext.Provider>
  );
}
