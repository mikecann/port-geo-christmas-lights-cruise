import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEntryView } from "../analytics/useEntryView";
import EntryNumberPad from "./EntryNumberPad";
import VoteScreen from "./VoteScreen";

// /v/<number>, where the QR code on each house sign goes
export default function VoteByNumberPage({
  entryNumber,
}: {
  entryNumber: string;
}) {
  const number = /^\d{1,4}$/.test(entryNumber) ? Number(entryNumber) : null;
  const found = useQuery(
    api.public.entries.findByNumberWithPhotos,
    number === null ? "skip" : { entryNumber: number },
  );
  useEntryView(found?.entry._id, found?.entry.competitionId, "entry");

  // The number from the sign shows straight away, before the entry loads
  if (number !== null && found === undefined)
    return <VoteScreen entryNumber={number} />;

  // The keypad says there's no display with that number
  if (!found)
    return (
      <EntryNumberPad initialValue={number === null ? "" : String(number)} />
    );

  return (
    <VoteScreen
      entryNumber={found.entry.entryNumber}
      entry={found.entry}
      photo={found.photos[0]}
    />
  );
}
