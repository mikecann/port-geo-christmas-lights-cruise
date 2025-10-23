import * as React from "react";
import { useEffect } from "react";
import { useConvexAuth } from "convex/react";
import { routes } from "../routes";

interface Props {
  children: React.ReactNode;
}

export const AuthRequired: React.FC<Props> = ({ children }) => {
  const { isLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      console.log("redirecting to signin");
      const currentPath = window.location.pathname + window.location.search;
      routes.signin({ returnTo: currentPath }).push();
    }
  }, [isLoading, isAuthenticated]);

  return <>{children}</>;
};
