import { useEffect, useRef, useState } from "react";
import { Box, Loader, Text, useComputedColorScheme } from "@mantine/core";

// Mermaid measures each drawing in a scratch element named by its id, so two
// drawings in flight with the same id (as in StrictMode) get mixed together
let drawings = 0;

// Draws a machine's Mermaid diagram. Mermaid is big and only this page needs
// it, so it's loaded on demand rather than in the main bundle.
export default function MachineDiagram({ diagram }: { diagram: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const colorScheme = useComputedColorScheme("dark");
  const [status, setStatus] = useState<"drawing" | "drawn" | "failed">(
    "drawing",
  );

  useEffect(() => {
    let cancelled = false;
    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: colorScheme === "dark" ? "dark" : "default",
          // Full size, so the labels stay readable. The box scrolls instead.
          state: { useMaxWidth: false },
        });
        drawings += 1;
        const { svg } = await mermaid.render(`machine-${drawings}`, diagram);
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = svg;
        setStatus("drawn");
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [diagram, colorScheme]);

  return (
    <Box style={{ overflowX: "auto" }}>
      {status === "drawing" && <Loader size="sm" />}
      {status === "failed" && (
        <Text size="sm" c="red">
          The diagram couldn't be drawn. The error is in the console.
        </Text>
      )}
      <div ref={ref} />
    </Box>
  );
}
