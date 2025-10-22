import { MainAppShell } from "./MainAppShell";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <>
      <MainAppShell>{children}</MainAppShell>
    </>
  );
}
