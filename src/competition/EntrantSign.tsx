import { Stack, Text } from "@mantine/core";
import { event, formatDate } from "../../shared/event";

export default function EntrantSign() {
  const { entriesClose, signCollection } = event;
  return (
    <Stack gap="sm">
      {entriesClose && (
        <Text>Entries close on {formatDate(entriesClose)}.</Text>
      )}
      <Text>
        Every entrant gets an A0 corflute sign with their own number and a QR
        code. Put it up on your canal side and light it so people can see it at
        night. The QR code is how people vote for you.
      </Text>
      {signCollection && (
        <Text>
          Signs can be collected from {formatDate(signCollection.from)} to{" "}
          {formatDate(signCollection.to)} at {signCollection.place}.
        </Text>
      )}
    </Stack>
  );
}
