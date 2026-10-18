// This year's event facts, kept in one place so they're easy to change. The
// site and the entrant emails both read from here. Dates are YYYY-MM-DD. A
// null hides the copy that needs it, so leave anything unconfirmed as null.

export type Award = { label?: string; count?: number; amount: number };

export type Prize = {
  name: string;
  awards: Award[];
  about: string;
  votedOnSite: boolean;
};

export type Sailing = { date: string; times: string[] };

export type EventFacts = {
  year: number;
  entriesClose: string | null;
  cruise: {
    operator: string;
    ticketPrice: number;
    ticketSeller: string;
    // The tickets button only shows once this is set
    ticketsUrl: string | null;
    sailings: Sailing[];
  };
  signCollection: { from: string; to: string; place: string } | null;
  voting: { opens: string; closes: string } | null;
  winnersPresentation: string | null;
  prizePool: number;
  prizes: Prize[];
  prizeTerms: string[];
  judges: string;
};

const sailing = (date: string, ...times: string[]): Sailing => ({
  date,
  times,
});

export const event: EventFacts = {
  year: 2026,
  entriesClose: "2026-12-04",
  cruise: {
    operator: "All Sea Charters",
    ticketPrice: 21,
    ticketSeller: "Eventbrite",
    ticketsUrl: null,
    sailings: [
      sailing("2026-12-04", "7:30pm"),
      sailing("2026-12-05", "7:30pm"),
      sailing("2026-12-06", "7:30pm"),
      sailing("2026-12-11", "7:30pm"),
      sailing("2026-12-12", "7:30pm"),
      sailing("2026-12-13", "7:30pm"),
      sailing("2026-12-17", "7:30pm", "8:30pm"),
      sailing("2026-12-18", "7:30pm", "8:30pm"),
      sailing("2026-12-19", "7:30pm", "8:30pm"),
      sailing("2026-12-20", "7:30pm", "8:30pm"),
      sailing("2026-12-21", "7:30pm", "8:30pm"),
      sailing("2026-12-22", "7:30pm", "8:30pm"),
      sailing("2026-12-23", "7:30pm", "8:30pm"),
      sailing("2026-12-24", "7:30pm", "8:30pm"),
    ],
  },
  // Proposed Sunday 29 November to Friday 4 December at 35 Keel Retreat, not
  // confirmed by ARG yet
  signCollection: null,
  // Proposed 4 to 27 December, not confirmed yet
  voting: null,
  // Proposed Saturday 9 January 2027, not confirmed yet
  winnersPresentation: null,
  prizePool: 20_000,
  prizes: [
    {
      name: "In-Person Favourites",
      awards: [
        { label: "1st", amount: 5_000 },
        { label: "2nd", amount: 2_000 },
        { label: "3rd", amount: 1_000 },
      ],
      about:
        "Best display, voted by people who saw it in person, from any boat or from the shore.",
      votedOnSite: true,
    },
    {
      name: "People's Choice",
      awards: [{ amount: 1_000 }],
      about:
        "Best display, voted online by people who haven't seen it in person.",
      votedOnSite: true,
    },
    {
      name: "Most Jolly Award",
      awards: [{ amount: 3_000 }],
      about:
        "For the best festive spirit: dancing, dressing up and festive fun. Voted by people who saw the display in person.",
      votedOnSite: true,
    },
    {
      name: "New Entrants",
      awards: [{ count: 6, amount: 1_000 }],
      about: "For first-time entrants. Picked by the judges.",
      votedOnSite: false,
    },
    {
      name: "Judges' Favourites",
      awards: [{ count: 2, amount: 1_000 }],
      about: "Participation prizes. Picked by the judges.",
      votedOnSite: false,
    },
  ],
  prizeTerms: [
    "Each entrant can win one prize per year.",
    "If you qualify for more than one prize, you get the highest-value one, and the lower prize goes to the next highest entrant.",
    "You can win in consecutive years, but the same entrant can't win the top prize two years in a row.",
    "Final decisions are at Aigle Royal Group's sole discretion.",
  ],
  judges:
    "The judges are the event sponsors, the Port Geo planning committee and Aigle Royal Group (ARG).",
};

// Emails go out for an entry's own competition, which might not be this year's
export const eventForYear = (year: number) =>
  year === event.year ? event : null;

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const parseDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

// "Friday 4 December", or "Fri 4 Dec" when short
export function formatDate(date: string, short = false) {
  const d = parseDate(date);
  const weekday = WEEKDAYS[d.getUTCDay()];
  const month = MONTHS[d.getUTCMonth()];
  return short
    ? `${weekday.slice(0, 3)} ${d.getUTCDate()} ${month.slice(0, 3)}`
    : `${weekday} ${d.getUTCDate()} ${month}`;
}

export const formatMoney = (amount: number) =>
  `$${amount.toLocaleString("en-AU")}`;

// "1st $5,000", "6 x $1,000"
export function formatAward(award: Award) {
  const amount = formatMoney(award.amount);
  if (award.label) return `${award.label} ${amount}`;
  if (award.count) return `${award.count} x ${amount}`;
  return amount;
}

export const prizeTotal = (prizes: Prize[]) =>
  prizes
    .flatMap((prize) => prize.awards)
    .reduce((sum, award) => sum + award.amount * (award.count ?? 1), 0);

// "4 to 24 December", from the first and last sailing
export function cruiseDateRange(sailings: Sailing[]) {
  if (sailings.length === 0) return null;
  const first = parseDate(sailings[0].date);
  const last = parseDate(sailings[sailings.length - 1].date);
  const firstMonth = MONTHS[first.getUTCMonth()];
  const lastMonth = MONTHS[last.getUTCMonth()];
  return firstMonth === lastMonth
    ? `${first.getUTCDate()} to ${last.getUTCDate()} ${lastMonth}`
    : `${first.getUTCDate()} ${firstMonth} to ${last.getUTCDate()} ${lastMonth}`;
}

// Sailings grouped by their departure times, in date order, so the schedule
// stays short: "7:30pm" for one run of nights, "7:30pm and 8:30pm" for another
export function cruiseTimeGroups(sailings: Sailing[]) {
  const groups: { times: string; dates: string[] }[] = [];
  for (const { date, times } of sailings) {
    const label = times.join(" and ");
    const last = groups[groups.length - 1];
    if (last?.times === label) last.dates.push(date);
    else groups.push({ times: label, dates: [date] });
  }
  return groups;
}
