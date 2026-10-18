import { Button, Stack, TextInput } from "@mantine/core";
import { useState } from "react";
import { routes } from "../routes";

// One big box for the number on a house sign, then off to its vote page
export default function EntryNumberForm({
  initialValue = "",
}: {
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const number = value.trim();
  const isValid = /^\d{1,4}$/.test(number);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!isValid) return;
        routes.voteByNumber({ entryNumber: String(Number(number)) }).push();
      }}
    >
      <Stack gap="md">
        <TextInput
          data-testid="entry-number-input"
          label="Type the number on the sign"
          size="xl"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={4}
          autoFocus
          value={value}
          onChange={(event) => setValue(event.currentTarget.value)}
          styles={{ input: { textAlign: "center", fontSize: "2.5rem" } }}
        />
        <Button type="submit" size="xl" fullWidth disabled={!isValid}>
          Go
        </Button>
      </Stack>
    </form>
  );
}
