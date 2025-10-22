import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Center, Loader } from "@mantine/core";
import { MeContext } from "./MeContext";

interface MeProviderProps {
  children: ReactNode;
}

export function MeProvider({ children }: MeProviderProps) {
  const me = useQuery(api.public.user.find);
  const isLoading = me === undefined;

  if (isLoading)
    return (
      <Center style={{ height: "100vh" }}>
        <Loader size="lg" />
      </Center>
    );

  return (
    <MeContext.Provider value={{ me, isLoading }}>
      {children}
    </MeContext.Provider>
  );
}
