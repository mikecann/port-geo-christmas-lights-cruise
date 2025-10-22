import { Box } from "@mantine/core";

export function Grass() {
  return (
    <Box
      style={{
        background: '#2d4c92 url("/grass.svg") left 10% repeat-x',
        position: "relative",
        zIndex: 4,
        height: 100,
        backgroundSize: "auto 175px",
        marginTop: `-10px`,
      }}
    />
  );
}
