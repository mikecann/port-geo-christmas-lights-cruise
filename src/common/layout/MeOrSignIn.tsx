import * as React from "react";
import { Loader, Button, UnstyledButton } from "@mantine/core";
import { routeGroups, routes, useRoute } from "../../routes";
import { UserAvatarDropdown } from "./UserAvatarDropdown";
import { MeAvatar } from "./PhoneMenu";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

// onAvatarClick: on a phone your picture opens the side menu instead of
// its own dropdown, so there's only ever one menu
export const MeOrSignIn: React.FC<{ onAvatarClick?: () => void }> = ({
  onAvatarClick,
}) => {
  const route = useRoute();
  // Nothing to sign in to from the sign-in page itself, and on the vote
  // screens the vote button asks people to sign in when they need to
  const hideSignIn =
    route.name === "signin" || routeGroups.voteScreen.has(route);

  return (
    <>
      <Authenticated>
        {onAvatarClick ? (
          <UnstyledButton onClick={onAvatarClick} aria-label="Menu">
            <MeAvatar />
          </UnstyledButton>
        ) : (
          <UserAvatarDropdown />
        )}
      </Authenticated>
      <Unauthenticated>
        {hideSignIn ? null : (
          // Quiet on purpose: most visitors are here to look, not to sign in
          <Button
            component="a"
            variant="default"
            size="sm"
            {...routes.signin({
              returnTo: window.location.pathname + window.location.search,
            }).link}
          >
            Sign in
          </Button>
        )}
      </Unauthenticated>
      <AuthLoading>
        <Loader size="sm" />
      </AuthLoading>
    </>
  );
};
