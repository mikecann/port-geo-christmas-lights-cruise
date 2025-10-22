import { Box } from "@mantine/core";
import { Grass } from "./Grass";

export function Trees() {
  return (
    <Box
      pos="relative"
      style={{ zIndex: 3 }}
      mt={{ base: -15, xs: -10, sm: -6 }}
    >
      <Box
        component="img"
        src="/tree-r.svg"
        alt="tree left"
        pos="absolute"
        style={{ transform: "scaleX(-1)", zIndex: 5 }}
        top={{ base: -150, xs: -200, sm: -300 }}
        h={{ base: 320, xs: 400, sm: 575 }}
        right={"75%"}
      />

      <Box
        component="img"
        src="/tree-r.svg"
        alt="tree right"
        pos="absolute"
        style={{ zIndex: 5 }}
        top={{ base: -150, xs: -200, sm: -300 }}
        h={{ base: 340, xs: 420, sm: 600 }}
        left={"75%"}
      />

      <Grass />
    </Box>
  );
}
