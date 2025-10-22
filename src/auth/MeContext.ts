import { createContext } from "react";
import { type Me } from "../../convex/public/user";

type MeContextType = {
  me: Me | null | undefined;
  isLoading: boolean;
};

export const MeContext = createContext<MeContextType | undefined>(undefined);
