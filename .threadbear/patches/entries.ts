// Threadbear patch (Threadbear's docs/protocol.md, "Patches"): the pages for running the cruise one
// click away, and how this year's entries stand. It reads production's tables but only counts them,
// so no entrant's details ever land in the panel. The answer is kept for 5 minutes.

type Ctx = { sh: (command: string) => Promise<string> };
type Competition = {
  _id: string;
  year: number;
  entriesOpen: boolean;
  votingOpen: boolean;
};
// An entry's state is its machine's: an object whose `kind` says where it's up to.
type Entry = { competitionId: string; state: { kind: string } };

const SITE = "https://portgeochristmascruise.com.au";
const KEEP_MS = 5 * 60 * 1000;

const rows = async <T>(sh: Ctx["sh"], table: string) =>
  (await sh(`npx convex data ${table} --prod --format jsonLines --limit 1000`))
    .split("\n")
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as T);

let cached:
  | {
      at: number;
      value: {
        year: number;
        entriesOpen: boolean;
        votingOpen: boolean;
        states: Record<string, number>;
      };
    }
  | undefined;
let pending: Promise<NonNullable<typeof cached>["value"]> | undefined;

function thisYear(sh: Ctx["sh"]) {
  if (cached && Date.now() - cached.at < KEEP_MS)
    return Promise.resolve(cached.value);
  pending ??= (async () => {
    const [competitions, entries] = await Promise.all([
      rows<Competition>(sh, "competitions"),
      rows<Entry>(sh, "entries"),
    ]);
    const latest = competitions.sort((a, b) => b.year - a.year)[0];
    const states: Record<string, number> = {};
    for (const entry of entries)
      if (entry.competitionId === latest._id)
        states[entry.state.kind] = (states[entry.state.kind] ?? 0) + 1;
    const value = {
      year: latest.year,
      entriesOpen: latest.entriesOpen,
      votingOpen: latest.votingOpen,
      states,
    };
    cached = { at: Date.now(), value };
    return value;
  })().finally(() => {
    pending = undefined;
  });
  return pending;
}

const n = (states: Record<string, number>, state: string) => states[state] ?? 0;

export default {
  icon: "sparkles",
  actions: [
    { title: "Admin", icon: "person.badge.key", url: `${SITE}/admin` },
    { title: "Live site", icon: "safari", url: `${SITE}/` },
    {
      title: "Sentry",
      icon: "exclamationmark.triangle",
      url: "https://mikec.sentry.io/issues/?project=4512336957734912",
    },
  ],
  panels: [
    {
      title: "Entries",
      icon: "list.number",
      note: "Counts only, refreshed every 5 minutes",
      // What's waiting on the organisers: an entry someone has submitted and nobody's approved.
      badge: async ({ sh }: Ctx) => n((await thisYear(sh)).states, "submitted"),
      items: async ({ sh }: Ctx) => {
        const y = await thisYear(sh);
        const total = Object.values(y.states).reduce((a, b) => a + b, 0);
        const waiting = n(y.states, "submitted");
        return [
          {
            title: `${total} ${total === 1 ? "entry" : "entries"} for ${y.year}`,
            detail: `Entries ${y.entriesOpen ? "open" : "closed"} · voting ${y.votingOpen ? "open" : "closed"}`,
            icon: "house",
            url: `${SITE}/admin`,
          },
          {
            title: `${waiting} waiting for approval`,
            icon: "clock",
            url: `${SITE}/admin`,
            tone: waiting ? "attention" : "done",
          },
          ...Object.entries(y.states)
            .filter(([state]) => state !== "submitted")
            .sort(([, a], [, b]) => b - a)
            .map(([state, count]) => ({
              title: `${count} ${state}`,
              icon: "circle",
            })),
        ];
      },
    },
  ],
};
