import * as React from "react";
import { Paper, Button } from "@mantine/core";

export const RequestedStatus: React.FC = () => {
  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      shadow="sm"
      style={{ backdropFilter: "blur(4px)" }}
    >
      Requested
    </Paper>
  );
};
