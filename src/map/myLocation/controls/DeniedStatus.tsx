import * as React from "react";
import { Paper, Button } from "@mantine/core";

export const DeniedStatus: React.FC = () => {
  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      shadow="sm"
      style={{ backdropFilter: "blur(4px)" }}
    >
      Denied
    </Paper>
  );
};
