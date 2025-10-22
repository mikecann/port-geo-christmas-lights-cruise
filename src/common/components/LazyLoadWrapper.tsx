import type { ReactNode } from "react";
import { Suspense, useEffect } from "react";
import { nprogress, NavigationProgress } from "@mantine/nprogress";

interface LazyLoadWrapperProps {
  children: ReactNode;
}

export function LazyLoadWrapper({ children }: LazyLoadWrapperProps) {
  return (
    <>
      <NavigationProgress />
      <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>
    </>
  );
}

function PageLoadingFallback() {
  useEffect(() => {
    nprogress.start();
    return () => nprogress.complete();
  }, []);

  return null;
}
