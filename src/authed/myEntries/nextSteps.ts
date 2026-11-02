import type { EventFacts } from "../../../shared/event";
import { formatDate } from "../../../shared/event";

// What an approved entrant does next. Built from the same shared/event.ts
// facts as the approval email's "Next Steps" (approvalHtml in
// convex/features/email/model.ts), so the two agree when the dates change.
export function approvedNextSteps(event: EventFacts | null) {
  const signCollection = event?.signCollection;
  const firstSailing = event?.cruise.sailings[0];

  return [
    signCollection
      ? `Collect your sign, with your number and a QR code, from ${formatDate(signCollection.from)} to ${formatDate(signCollection.to)} at ${signCollection.place}.`
      : "Collect your sign, with your number and a QR code. We'll email you when and where.",
    "Put it up on your canal side, lit so it can be seen at night. The QR code is how people vote for you.",
    firstSailing
      ? `Have your lights on from the first cruise on ${formatDate(firstSailing.date)}, and during cruise times after that.`
      : "Have your lights on during the cruise times in December. We'll email you the schedule.",
  ];
}
