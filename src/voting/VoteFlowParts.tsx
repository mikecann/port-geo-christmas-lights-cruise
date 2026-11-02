// The pieces of the vote flow's bottom bar and sheets. Each piece only takes
// what it shows, and the words are kept to what's needed to act.
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import {
  Anchor,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Loader,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  VisuallyHidden,
} from "@mantine/core";
import { IconArrowRight, IconCheck, IconDialpad } from "@tabler/icons-react";
import switchClasses from "./InPersonSwitch.module.css";
import classes from "./VoteScreen.module.css";
import { eventForYear } from "../../shared/event";
import {
  SEEN_IN_PERSON_REQUIRED_MESSAGE,
  VOTE_CATEGORY_NAMES,
  votingClosedCopy,
  type VotingPhase,
} from "../../shared/voting";
import { isSignupDisabled } from "../common/auth";
import { InfoTip } from "../authed/PageHeader";
import { routes } from "../routes";
import { EmailCodeSignIn } from "../auth/EmailCodeSignIn";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import {
  VOTE_CATEGORY_DETAILS,
  type VoteCategory,
} from "../../convex/features/votes/schema";
import type { JustVoted, MyVote } from "./useVoteFlow";
import type { VoteButtonStatus } from "./voteButtons";
import { bulbsAroundRect, voteBulbColors, type Point } from "./bulbs";

// The number as it is on the house sign
export function SignNumber({
  entryNumber,
  size,
}: {
  entryNumber: number;
  size?: "sm";
}) {
  return (
    <span className={classes.number} data-size={size}>
      {entryNumber}
    </span>
  );
}

export function VoteBarLoading() {
  return (
    <Stack gap="sm">
      <div className={classes.slot}>
        <Loader size="sm" />
      </div>
      <Button size="xl" fullWidth disabled loading>
        Vote
      </Button>
    </Stack>
  );
}

export function VotingClosedNotice({
  phase,
  year,
}: {
  phase: Exclude<VotingPhase, "open">;
  year: number;
}) {
  const { title, detail } = votingClosedCopy(phase, eventForYear(year));
  return (
    <Stack data-testid="voting-closed" gap={4} align="center" py="md">
      <Text fw={700} size="lg">
        {title}
      </Text>
      <Text size="sm" c="dimmed" ta="center">
        {detail}
      </Text>
    </Stack>
  );
}

export function OwnEntryNotice() {
  return (
    <Stack gap={4} align="center" py="md">
      <Text fw={700} size="lg">
        This is your display
      </Text>
      <Text size="sm" c="dimmed">
        You can't vote for your own.
      </Text>
    </Stack>
  );
}

const categoryName = (category: VoteCategory) =>
  VOTE_CATEGORY_NAMES[category].inSentence;

// Their votes for other entries in the categories they can vote in here
export function VotedForOtherEntries({ votes }: { votes: MyVote[] }) {
  const [only] = votes;
  return (
    <Text size="sm" c="dimmed" ta="center" lineClamp={1}>
      {votes.length === 1
        ? `Your ${categoryName(only.category)} vote: #${only.entry.entryNumber} ${only.entry.name}`
        : `Your votes: ${votes
            .map(
              (vote) =>
                `#${vote.entry.entryNumber} ${categoryName(vote.category)}`,
            )
            .join(", ")}`}
    </Text>
  );
}

// Above the Vote button: the seen-it switch, or why there isn't one. It keeps
// its height whichever it shows.
export function InPersonSlot({
  inPersonAllowed,
  canRetryLocation,
  peoplesChoiceReason,
  value,
  nudgedAt,
  onChange,
  onRetry,
}: {
  inPersonAllowed: boolean | null;
  canRetryLocation: boolean;
  peoplesChoiceReason: string | null;
  value: boolean | null;
  nudgedAt: number | null;
  onChange: (value: boolean | null) => void;
  onRetry: () => void;
}) {
  return (
    <div className={classes.slot}>
      {inPersonAllowed === null && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            Checking your location…
          </Text>
        </Group>
      )}
      {inPersonAllowed === true && (
        <InPersonSwitch value={value} nudgedAt={nudgedAt} onChange={onChange} />
      )}
      {inPersonAllowed === false && (
        <>
          <Group gap={6} justify="center">
            <Text size="sm" c="dimmed">
              Counts for People's Choice only
            </Text>
            {peoplesChoiceReason && <InfoTip>{peoplesChoiceReason}</InfoTip>}
          </Group>
          {canRetryLocation && (
            <Button variant="subtle" size="compact-sm" onClick={onRetry}>
              Check my location again
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// Three stops, with "not answered" in the middle, so nobody is counted as
// "not seen" just because they missed it. The chosen answer gets a plain
// fill, as green on these buttons means "voted".
export function InPersonSwitch({
  value,
  nudgedAt,
  onChange,
}: {
  value: boolean | null;
  // When they tapped Vote without answering, to point the switch out
  nudgedAt: number | null;
  onChange: (value: boolean | null) => void;
}) {
  const labelId = useId();
  const isNudged = nudgedAt !== null && value === null;
  return (
    <Stack gap={6} w="100%">
      <Text
        id={labelId}
        size="sm"
        fw={600}
        ta="center"
        c={isNudged ? "yellow" : undefined}
        aria-live="polite"
      >
        {isNudged ? SEEN_IN_PERSON_REQUIRED_MESSAGE : "Seen it in person?"}
      </Text>
      {/* Keyed on the tap, so a second tap plays the pulse again */}
      <Box
        key={nudgedAt ?? "calm"}
        className={switchClasses.frame}
        mod={{ nudged: isNudged }}
      >
        <SegmentedControl
          data-testid="seen-in-person"
          aria-labelledby={labelId}
          fullWidth
          size="md"
          radius="xl"
          classNames={switchClasses}
          mod={{ unset: value === null }}
          value={value === null ? "unset" : value ? "seen" : "notSeen"}
          onChange={(next) =>
            onChange(next === "unset" ? null : next === "seen")
          }
          data={[
            { value: "seen", label: "I've seen it" },
            {
              value: "unset",
              label: (
                <>
                  <span className={switchClasses.dot} aria-hidden />
                  <VisuallyHidden>Not answered yet</VisuallyHidden>
                </>
              ),
            },
            { value: "notSeen", label: "I haven't seen it" },
          ]}
        />
      </Box>
    </Stack>
  );
}

// How far outside the button's edge the bulbs sit, under half the gap
// between the two category buttons so they never reach the other one, and
// roughly how far apart they are
const BULB_OFFSET = 5;
const BULB_SPACING = 22;
// How long the lights take to come on all the way round, however many
const CHASE_MS = 450;

// A string of lights round the outside of a vote button as the vote goes in,
// coming on round the loop then fading into the calm voted look. Measured
// once as it lights, so there are as many as fit that button.
function VoteLights({ category }: { category: VoteCategory }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [bulbs, setBulbs] = useState<Point[]>([]);
  useLayoutEffect(() => {
    const button = ref.current?.parentElement?.querySelector("button");
    if (!button) return;
    setBulbs(
      bulbsAroundRect({
        width: button.offsetWidth,
        height: button.offsetHeight,
        radius: parseFloat(getComputedStyle(button).borderTopLeftRadius) || 0,
        offset: BULB_OFFSET,
        spacing: BULB_SPACING,
      }),
    );
  }, []);
  const colors = voteBulbColors(category, bulbs.length);
  return (
    <Box
      ref={ref}
      component="span"
      className={classes.voteLights}
      style={{ "--bulb-step": `${CHASE_MS / Math.max(bulbs.length, 1)}ms` }}
      aria-hidden
    >
      {bulbs.map(({ x, y }, i) => (
        <Box
          key={i}
          component="span"
          className={classes.voteBulb}
          style={{
            left: x,
            top: y,
            "--bulb-color": `var(--mantine-color-${colors[i]})`,
            "--bulb-index": i,
          }}
        />
      ))}
    </Box>
  );
}

// Round a vote button, for its lights, as the button clips what's inside it.
// Always there, so the button isn't remade (and focus lost) when it lights.
function VoteLightsFrame({
  lit,
  className,
  children,
}: {
  lit: JustVoted | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Box
      className={`${classes.lightsFrame} ${className ?? ""}`}
      mod={{ celebrate: lit?.category }}
    >
      {children}
      {lit && <VoteLights key={lit.at} category={lit.category} />}
    </Box>
  );
}

// Calmer once their vote is on this entry
export function CastVoteButton({
  ref,
  label,
  isVoted,
  isBusy,
  justVoted,
  disabled,
  isWaiting,
  onClick,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  isVoted: boolean;
  isBusy: boolean;
  justVoted: JustVoted | null;
  disabled?: boolean;
  // Looks greyed out but still takes a tap, to say what it's waiting for
  isWaiting?: boolean;
  onClick: () => void;
}) {
  return (
    <VoteLightsFrame
      lit={justVoted?.category === "best_display" ? justVoted : null}
    >
      <Button
        ref={ref}
        data-testid="cast-vote"
        size="xl"
        fullWidth
        color={isVoted ? "green" : "yellow"}
        variant={isVoted ? "light" : "filled"}
        autoContrast
        leftSection={
          isVoted && (
            <IconCheck size={20} className={classes.votedTick} aria-hidden />
          )
        }
        loading={isBusy}
        disabled={disabled}
        // No aria-disabled: it does something when tapped (points at the
        // question), so a screen reader shouldn't announce it as dead
        mod={{ waiting: isWaiting }}
        className={classes.castVote}
        onClick={onClick}
      >
        {label}
      </Button>
    </VoteLightsFrame>
  );
}

const CATEGORY_HINTS: Partial<Record<VoteButtonStatus, string>> = {
  voted: "Voted",
  update: "Update my vote",
};

// Best display and Most Jolly side by side, for people who've seen it. A tick
// marks the ones they've voted for this entry.
export function CategoryVoteButtons({
  status,
  busy,
  justVoted,
  removing,
  onVote,
  onRemove,
  onKeep,
}: {
  status: (category: VoteCategory) => VoteButtonStatus;
  busy: VoteCategory | null;
  justVoted: JustVoted | null;
  removing: VoteCategory | null;
  onVote: (category: VoteCategory) => void;
  onRemove: () => void;
  onKeep: () => void;
}) {
  return (
    <Group grow gap="xs" wrap="nowrap" align="stretch">
      {(["best_display", "most_jolly"] as const).map((category) => {
        const { hint } = VOTE_CATEGORY_DETAILS[category];
        const { title } = VOTE_CATEGORY_NAMES[category];
        const isVoted = status(category) === "voted";
        return (
          <VoteLightsFrame
            key={category}
            lit={justVoted?.category === category ? justVoted : null}
            className={classes.categoryCell}
          >
            <RemoveVoteConfirm
              category={category}
              opened={removing === category}
              isBusy={busy === category}
              onRemove={onRemove}
              onKeep={onKeep}
            >
              <Button
                data-testid={`vote-${category}`}
                size="xl"
                fullWidth
                color={isVoted ? "green" : "yellow"}
                variant={isVoted ? "light" : "filled"}
                autoContrast
                loading={busy === category}
                disabled={busy !== null && busy !== category}
                onClick={() => onVote(category)}
                classNames={{
                  root: classes.categoryButton,
                  label: classes.categoryLabel,
                }}
              >
                <span className={classes.categoryTitle}>
                  {isVoted && (
                    <IconCheck
                      size={18}
                      className={classes.votedTick}
                      aria-hidden
                    />
                  )}
                  {title}
                </span>
                <span className={classes.categoryHint}>
                  {CATEGORY_HINTS[status(category)] ?? hint}
                </span>
              </Button>
            </RemoveVoteConfirm>
          </VoteLightsFrame>
        );
      })}
    </Group>
  );
}

// Tapping a vote that's on this entry asks before taking it off
export function RemoveVoteConfirm({
  category,
  opened,
  isBusy,
  onRemove,
  onKeep,
  children,
}: {
  category: VoteCategory;
  opened: boolean;
  isBusy: boolean;
  onRemove: () => void;
  onKeep: () => void;
  children: ReactElement;
}) {
  return (
    <Popover
      opened={opened}
      onDismiss={onKeep}
      position="top"
      withArrow
      shadow="md"
      trapFocus
      returnFocus
    >
      <Popover.Target>{children}</Popover.Target>
      <Popover.Dropdown data-testid="remove-vote">
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Remove your {categoryName(category)} vote?
          </Text>
          <Group gap="xs" grow wrap="nowrap">
            <Button variant="default" disabled={isBusy} onClick={onKeep}>
              Keep
            </Button>
            <Button color="red" loading={isBusy} onClick={onRemove}>
              Remove
            </Button>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

function BottomSheet({
  opened,
  onClose,
  title,
  children,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      size="auto"
      title={title}
      classNames={{
        content: classes.sheet,
        header: classes.sheetInner,
        body: `${classes.sheetInner} ${classes.sheetBody}`,
      }}
      styles={{
        // Only as tall as what's in it, so the photo shows above
        content: { height: "auto", maxHeight: "90dvh" },
        title: { fontWeight: 700, fontSize: "1.25rem" },
      }}
      closeButtonProps={{ "aria-label": "Close", size: "lg" }}
    >
      {children}
    </Drawer>
  );
}

// Slides up over the photo when a signed out person taps Vote. Their vote
// sends itself once they're in.
export function SignInSheet({
  opened,
  entryNumber,
  onGoogle,
  onClose,
}: {
  opened: boolean;
  entryNumber: number;
  onGoogle: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet opened={opened} onClose={onClose} title="Sign in to vote">
      <Stack gap="sm">
        {/* So signing in doesn't feel like a detour that loses their vote */}
        <Text size="sm" c="dimmed">
          Your vote for #{entryNumber} goes in as soon as you're signed in.
        </Text>
        <GoogleSignInButton
          returnTo={window.location.pathname + window.location.search}
          signupDisabled={isSignupDisabled()}
          onStart={onGoogle}
        />
        <Divider label="or" labelPosition="center" />
        <EmailCodeSignIn compact />
      </Stack>
    </BottomSheet>
  );
}

function SheetEntry({
  entry,
  isFrom,
}: {
  entry: { entryNumber: number; name: string };
  isFrom?: boolean;
}) {
  return (
    <Stack
      gap={6}
      align="center"
      className={classes.sheetEntry}
      mod={{ from: isFrom }}
    >
      <VisuallyHidden>{isFrom ? "From" : "To"}</VisuallyHidden>
      <SignNumber entryNumber={entry.entryNumber} size="sm" />
      <Text size="sm" fw={600} lineClamp={2}>
        {entry.name}
      </Text>
    </Stack>
  );
}

// One vote each per category, so moving it to another display gets asked
// first
export function SwitchVoteSheet({
  opened,
  category,
  from,
  to,
  isBusy,
  onConfirm,
  onClose,
}: {
  opened: boolean;
  category: VoteCategory;
  from: { entryNumber: number; name: string };
  to: { entryNumber: number; name: string };
  isBusy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      opened={opened}
      onClose={onClose}
      title={`Move your ${categoryName(category)} vote?`}
    >
      <Stack gap="md">
        <Group justify="center" gap="md" wrap="nowrap">
          <SheetEntry entry={from} isFrom />
          <IconArrowRight size={24} aria-hidden />
          <SheetEntry entry={to} />
        </Group>
        <Stack gap="xs">
          <Button
            data-testid="confirm-switch"
            size="xl"
            fullWidth
            color="yellow"
            autoContrast
            loading={isBusy}
            onClick={onConfirm}
          >
            Move it to #{to.entryNumber}
          </Button>
          <Button
            size="lg"
            fullWidth
            variant="default"
            disabled={isBusy}
            onClick={onClose}
          >
            Keep it on #{from.entryNumber}
          </Button>
        </Stack>
      </Stack>
    </BottomSheet>
  );
}

// Their location couldn't be confirmed even after a few tries, so nothing was
// sent. The buttons stay as they were; People's Choice is only ever their
// choice, never a quiet fallback.
export function LocationFailedNotice({
  canVotePeoplesChoice,
  onRetry,
  onPeoplesChoice,
}: {
  canVotePeoplesChoice: boolean;
  onRetry: () => void;
  onPeoplesChoice: () => void;
}) {
  return (
    <Stack gap={6} align="center" role="alert" data-testid="location-failed">
      <Text size="sm" ta="center">
        We couldn't confirm your location, so your vote hasn't gone in.
      </Text>
      <Group gap="xs" justify="center">
        <Button variant="light" size="compact-md" onClick={onRetry}>
          Try again
        </Button>
        {canVotePeoplesChoice && (
          <Button
            variant="subtle"
            color="gray"
            size="compact-md"
            onClick={onPeoplesChoice}
          >
            Count it for People's Choice
          </Button>
        )}
      </Group>
    </Stack>
  );
}

// Once they've voted here: on to the next sign, which is what most people on
// the boat want, or the list
export function AfterVoteLinks() {
  return (
    <Group gap="md" justify="center">
      <Button
        component="a"
        variant="light"
        size="sm"
        leftSection={<IconDialpad size={18} aria-hidden />}
        {...routes.voteLanding().link}
      >
        Another number
      </Button>
      <Anchor size="sm" {...routes.entries().link}>
        All displays
      </Anchor>
    </Group>
  );
}
