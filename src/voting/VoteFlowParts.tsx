// The pieces of the vote flow's bottom bar and sheets. Each piece only takes
// what it shows, and the words are kept to what's needed to act.
import { useId, type ReactElement, type ReactNode, type Ref } from "react";
import {
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
import {
  IconArrowRight,
  IconArrowsLeftRight,
  IconCheck,
} from "@tabler/icons-react";
import switchClasses from "./InPersonSwitch.module.css";
import classes from "./VoteScreen.module.css";
import { eventForYear, formatDate } from "../../shared/event";
import { isSignupDisabled } from "../common/auth";
import { EmailCodeSignIn } from "../auth/EmailCodeSignIn";
import { GoogleSignInButton } from "../auth/GoogleSignInButton";
import {
  VOTE_CATEGORY_DETAILS,
  type VoteCategory,
} from "../../convex/features/votes/schema";
import type { MyVote } from "./useVoteFlow";
import type { VoteButtonStatus } from "./voteButtons";

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

export function VotingClosedNotice({ year }: { year: number }) {
  const voting = eventForYear(year)?.voting;
  return (
    <Stack data-testid="voting-closed" gap={4} align="center" py="md">
      <Text fw={700} size="lg">
        Voting is closed
      </Text>
      {voting && (
        <Text size="sm" c="dimmed">
          Open {formatDate(voting.opens, true)} to{" "}
          {formatDate(voting.closes, true)}
        </Text>
      )}
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
  VOTE_CATEGORY_DETAILS[category].title.toLowerCase();

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
  value,
  onChange,
  onRetry,
}: {
  inPersonAllowed: boolean | null;
  canRetryLocation: boolean;
  value: boolean | null;
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
        <InPersonSwitch value={value} onChange={onChange} />
      )}
      {inPersonAllowed === false && (
        <>
          <Text size="sm" c="dimmed">
            Counts for People's Choice only
          </Text>
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
// "not seen" just because they missed it
export function InPersonSwitch({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  const labelId = useId();
  return (
    <Stack gap={6} w="100%">
      <Text id={labelId} size="sm" fw={600} ta="center">
        Seen it in person?
      </Text>
      <SegmentedControl
        data-testid="seen-in-person"
        aria-labelledby={labelId}
        fullWidth
        size="md"
        radius="xl"
        classNames={switchClasses}
        mod={{ unset: value === null }}
        color={value === null ? undefined : value ? "green" : "blue"}
        value={value === null ? "unset" : value ? "seen" : "notSeen"}
        onChange={(next) => onChange(next === "unset" ? null : next === "seen")}
        data={[
          { value: "seen", label: "I've seen it" },
          {
            value: "unset",
            label: (
              <>
                <IconArrowsLeftRight size={18} aria-hidden />
                <VisuallyHidden>Not answered yet</VisuallyHidden>
              </>
            ),
          },
          { value: "notSeen", label: "I haven't seen it" },
        ]}
      />
    </Stack>
  );
}

// Calmer once their vote is on this entry
export function CastVoteButton({
  ref,
  label,
  isVoted,
  isBusy,
  disabled,
  onClick,
}: {
  ref?: Ref<HTMLButtonElement>;
  label: string;
  isVoted: boolean;
  isBusy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      ref={ref}
      data-testid="cast-vote"
      size="xl"
      fullWidth
      color={isVoted ? "green" : "yellow"}
      variant={isVoted ? "light" : "filled"}
      autoContrast
      leftSection={isVoted && <IconCheck size={20} aria-hidden />}
      loading={isBusy}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

const CATEGORY_HINTS: Partial<Record<VoteButtonStatus, string>> = {
  voted: "Voted",
  update: "Update my vote",
};

// Best display and Most jolly side by side, for people who've seen it. A tick
// marks the ones they've voted for this entry.
export function CategoryVoteButtons({
  status,
  busy,
  removing,
  onVote,
  onRemove,
  onKeep,
}: {
  status: (category: VoteCategory) => VoteButtonStatus;
  busy: VoteCategory | null;
  removing: VoteCategory | null;
  onVote: (category: VoteCategory) => void;
  onRemove: () => void;
  onKeep: () => void;
}) {
  return (
    <Group grow gap="xs" wrap="nowrap" align="stretch">
      {(["best_display", "most_jolly"] as const).map((category) => {
        const { title, hint } = VOTE_CATEGORY_DETAILS[category];
        const isVoted = status(category) === "voted";
        return (
          <RemoveVoteConfirm
            key={category}
            category={category}
            opened={removing === category}
            isBusy={busy === category}
            onRemove={onRemove}
            onKeep={onKeep}
          >
            <Button
              data-testid={`vote-${category}`}
              size="xl"
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
                {isVoted && <IconCheck size={18} aria-hidden />}
                {title}
              </span>
              <span className={classes.categoryHint}>
                {CATEGORY_HINTS[status(category)] ?? hint}
              </span>
            </Button>
          </RemoveVoteConfirm>
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
  onGoogle,
  onClose,
}: {
  opened: boolean;
  onGoogle: () => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet opened={opened} onClose={onClose} title="Sign in to vote">
      <Stack gap="sm">
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
