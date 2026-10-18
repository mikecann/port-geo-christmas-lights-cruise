import type { EntryStatusKinds } from "../../../../convex/features/entries/schema";

// "submitting" only lasts while the address is checked, so admins see it as
// not sent in yet, the same as a draft
export const ENTRY_STATUS_LABELS: Record<EntryStatusKinds, string> = {
  draft: "Not sent in yet",
  submitting: "Not sent in yet",
  submitted: "Waiting for review",
  approved: "Approved",
  rejected: "Rejected",
};

export const ENTRY_STATUS_COLORS: Record<EntryStatusKinds, string> = {
  draft: "gray",
  submitting: "gray",
  submitted: "yellow",
  approved: "green",
  rejected: "red",
};
