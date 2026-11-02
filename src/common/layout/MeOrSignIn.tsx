import * as React from "react";
import { Loader, Button } from "@mantine/core";
import { routeGroups, routes, useRoute } from "../../routes";
import { UserAvatarDropdown } from "./UserAvatarDropdown";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export const MeOrSignIn: React.FC = () => {
  const route = useRoute();
  // Nothing to sign in to from the sign-in page itself, and on the vote
  // screens the vote button asks people to sign in when they need to
  const hideSignIn =
    route.name === "signin" || routeGroups.voteScreen.has(route);

  return (
    <>
      <Authenticated>
        <UserAvatarDropdown />
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
