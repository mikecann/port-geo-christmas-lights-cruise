import * as React from "react";
import { Text, Loader, Button } from "@mantine/core";
import { routes } from "../../routes";
import { UserAvatarDropdown } from "./UserAvatarDropdown";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

export const MeOrSignIn: React.FC = () => {
  return (
    <>
      <Authenticated>
        <UserAvatarDropdown />
      </Authenticated>
      <Unauthenticated>
        <Button
          component="a"
          {...routes.signin({
            returnTo: window.location.pathname + window.location.search,
          }).link}
        >
          Sign In
        </Button>
      </Unauthenticated>
      <AuthLoading>
        <Loader />
      </AuthLoading>
    </>
  );
};
