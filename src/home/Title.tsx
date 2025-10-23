import { Box } from "@mantine/core";
import { useEffect, useState } from "react";

export function Title() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Trigger entrance animation after mount
    const id = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Box
      w={{ base: "95%", xs: "90%", sm: 700, lg: 800 }}
      mb={{ base: 0, xs: 0, sm: 0 }}
      mt={{ base: 50, xs: 100, sm: 100, lg: 100 }}
      mx="auto"
      style={{ position: "relative", zIndex: 5 }}
      pt={{ base: 200, xs: 200, sm: 300, lg: 300 }}
    >
      <img
        src="/title-no-year-1024.webp"
        alt="2024 Port Geographe"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transition: "all 3s ease",
          opacity: active ? 1 : 0,
          transform: active ? "translate(0, 0)" : "translate(-70px, 8px)",
        }}
      />
    </Box>
  );
}
