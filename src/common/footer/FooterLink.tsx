import { Anchor } from "@mantine/core";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import type { ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { routes } from "../../routes";
import EntrySignupUnavailableButton from "../../competition/EntrySignupUnavailableButton";

// Links are brighter than the plain text around them, so the two don't look
// the same
export const FOOTER_LINK_COLOR = "gray.3";

export function FooterLink({
  link,
  children,
}: {
  link: { href: string; onClick?: React.MouseEventHandler<HTMLAnchorElement> };
  children: ReactNode;
}) {
  return (
    <Anchor {...link} c={FOOTER_LINK_COLOR} size="sm">
      {children}
    </Anchor>
  );
}

// Signed in it goes to your entry, signed out via sign-in, and while entries
// are closed it explains that instead. Still loading counts as closed, so
// the link can't be followed before we know entries are open.
export function EnterCompetitionLink({ children }: { children: ReactNode }) {
  const competition = useQuery(api.public.competitions.current, {});

  if (competition?.entriesOpen !== true)
    return <EntrySignupUnavailableButton link label={children} />;

  return (
    <>
      <Authenticated>
        <FooterLink link={routes.myEntries().link}>{children}</FooterLink>
      </Authenticated>
      <Unauthenticated>
        <FooterLink
          link={routes.signin({ returnTo: routes.myEntries().href }).link}
        >
          {children}
        </FooterLink>
      </Unauthenticated>
    </>
  );
}
