import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  Container,
  Paper,
  Title,
  Stack,
  Text,
  Anchor,
  Box,
  Alert,
  Divider,
} from "@mantine/core";
import { routes, useRoute } from "../routes";
import { useConvexAuth } from "convex/react";
import { isSignupDisabled } from "../common/auth";
import { safeReturnTo } from "./returnTo";
import { EmailCodeSignIn } from "./EmailCodeSignIn";
import { GoogleSignInButton } from "./GoogleSignInButton";

// Grows with its content rather than clipping it, so the form stays
// reachable on a short phone screen with the keyboard up
function SignInBackdrop({ children }: { children: ReactNode }) {
  return (
    <Box
      style={{
        minHeight: "calc(100svh - 60px)",
        background:
          "linear-gradient(135deg, #0b1c3b 0%, #1a2332 50%, #0a0f1a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Container size="xs" py="xl" w="100%">
        <Paper withBorder shadow="md" p={{ base: "lg", xs: "xl" }} radius="md">
          {children}
        </Paper>
      </Container>
    </Box>
  );
}

export function SignInPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const route = useRoute();

  // returnTo comes from the URL, so only ever follow it to a path on this site.
  const returnTo =
    safeReturnTo(route.name === "signin" ? route.params.returnTo : undefined) ??
    routes.map().href;

  useEffect(() => {
    if (!isAuthenticated) return;
    window.location.href = returnTo;
  }, [isAuthenticated, returnTo]);

  const signupDisabled = isSignupDisabled();
  const params = route.name === "signin" ? route.params : undefined;
  const signInTurnedAway =
    signupDisabled &&
    params?.attempted === true &&
    !isAuthLoading &&
    !isAuthenticated;

  if (signupDisabled && params?.unlock !== true)
    return (
      <SignInBackdrop>
        Sign in and signup is currently under construction. Please check back
        later.
      </SignInBackdrop>
    );

  return (
    <SignInBackdrop>
      <Stack gap="md">
        <Title order={1} ta="center" size="2rem" fw={700}>
          Sign in
        </Title>

        <Text ta="center" size="sm" c="dimmed">
          To vote and to enter your lights. New here? Signing in sets up your
          account.
        </Text>

        {signInTurnedAway && (
          <Alert color="red" title="Sign-in didn't complete">
            If you're new here, accounts can't be created until sign-ups open.
            If you already have an account, try again with the Google account or
            email address you used before.
          </Alert>
        )}

        <GoogleSignInButton
          returnTo={returnTo}
          signupDisabled={signupDisabled}
        />

        <Divider label="Or get a code by email" labelPosition="center" />

        <EmailCodeSignIn />

        <Text ta="center">
          <Anchor component="a" {...routes.home().link} size="sm">
            ← Back to Home
          </Anchor>
        </Text>
      </Stack>
    </SignInBackdrop>
  );
}
