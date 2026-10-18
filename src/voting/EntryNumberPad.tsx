import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { Anchor, Button, Loader, Text } from "@mantine/core";
import { IconArrowRight, IconBackspace } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { useDebounce } from "use-debounce";
import { api } from "../../convex/_generated/api";
import type { PublicPhoto } from "../../convex/features/photos/schema";
import { usePhotoUrl } from "../common/hooks/usePhotoUrl";
import { routes } from "../routes";
import classes from "./EntryNumberPad.module.css";
import { deleteDigit, typeDigit } from "./entryNumberInput";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

// A big on-page keypad for the number on a house sign, naming the display as
// you type, then off to its vote page. Phones' own keyboards are fiddly on a
// moving boat.
export default function EntryNumberPad({
  initialValue = "",
}: {
  initialValue?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [looked] = useDebounce(value, 250);
  const found = useQuery(
    api.public.entries.findByNumberWithPhotos,
    looked === "" ? "skip" : { entryNumber: Number(looked) },
  );
  // undefined while it's still looking
  const match = looked === value ? found : undefined;
  const canGo = value !== "" && match !== null;
  const go = () => {
    if (canGo) routes.voteByNumber({ entryNumber: value }).push();
  };

  // A real keyboard works too, unless it's on a button already
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, input, a")
    )
      return;
    if (/^\d$/.test(event.key))
      setValue((current) => typeDigit(current, event.key));
    else if (event.key === "Backspace") setValue(deleteDigit);
    else if (event.key === "Enter") go();
  });
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={classes.pad}>
      <h1 className={classes.title}>Type the number on the sign</h1>
      <output
        data-testid="entry-number-display"
        className={classes.display}
        data-empty={value === "" || undefined}
        aria-label="Number"
      >
        {value === "" ? "–" : value}
      </output>
      <div className={classes.match} aria-live="polite">
        {value !== "" && match === undefined && <Loader size="sm" />}
        {match === null && (
          <Text c="dimmed" data-testid="entry-number-missing">
            No display #{value}
          </Text>
        )}
        {match && <MatchedEntry entry={match.entry} photo={match.photos[0]} />}
      </div>
      <Anchor size="sm" {...routes.entries().link}>
        Browse all displays
      </Anchor>
      <div className={classes.keys}>
        {DIGITS.map((digit) => (
          <Key key={digit} onClick={() => setValue((v) => typeDigit(v, digit))}>
            {digit}
          </Key>
        ))}
        <Key
          aria-label="Delete"
          disabled={value === ""}
          onClick={() => setValue(deleteDigit)}
        >
          <IconBackspace size={28} aria-hidden />
        </Key>
        <Key onClick={() => setValue((v) => typeDigit(v, "0"))}>0</Key>
        <Button
          data-testid="entry-number-go"
          h={64}
          size="xl"
          color="yellow"
          autoContrast
          disabled={!canGo}
          rightSection={<IconArrowRight size={22} aria-hidden />}
          onClick={go}
        >
          Go
        </Button>
      </div>
    </div>
  );
}

function Key(props: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  return <Button variant="default" h={64} fz={28} fw={600} {...props} />;
}

function MatchedEntry({
  entry,
  photo,
}: {
  entry: { entryNumber: number; name: string };
  photo: PublicPhoto | undefined;
}) {
  const thumbnail = usePhotoUrl(photo, { size: "xs" });
  return (
    <>
      {thumbnail && (
        <img className={classes.thumbnail} src={thumbnail} alt="" />
      )}
      <Text fw={700} size="lg" lineClamp={1} data-testid="entry-number-match">
        {entry.name}
      </Text>
    </>
  );
}
