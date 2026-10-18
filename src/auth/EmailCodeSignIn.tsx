import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { authStarted, track } from "../analytics/client";
import { getErrorMessage } from "../common/errors";
import {
  EMAIL_CODE_PROVIDER_ID,
  normalizeEmail,
  SIGN_IN_CODE_LENGTH,
  SIGN_IN_CODE_LIFETIME_MINUTES,
} from "../../shared/auth";
import { codeDigits } from "./signInCode";

const RESEND_AFTER_SECONDS = 30;

const SEND_FAILED_MESSAGE =
  "We couldn't send a code just now. Check your connection and try again.";

// Convex hides why a code was turned away (wrong, expired, or too many
// tries), so one message covers them all
const WRONG_CODE_MESSAGE =
  "That code didn't work. Check it and try again, or send a new one.";

// Signing in moves the page on by itself (see SignInPage), so this only has
// to get the code checked
export function EmailCodeSignIn() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async (address: string) => {
    setIsBusy(true);
    setError(undefined);
    authStarted();
    try {
      await signIn(EMAIL_CODE_PROVIDER_ID, { email: address });
      setSentTo(address);
      setCode("");
      setResendIn(RESEND_AFTER_SECONDS);
    } catch (sendError) {
      track("auth_failed");
      setError(getErrorMessage(sendError, SEND_FAILED_MESSAGE));
    } finally {
      setIsBusy(false);
    }
  };

  const checkCode = async (value: string) => {
    if (sentTo === undefined || isBusy) return;
    setIsBusy(true);
    setError(undefined);
    let message = WRONG_CODE_MESSAGE;
    try {
      const { signingIn } = await signIn(EMAIL_CODE_PROVIDER_ID, {
        email: sentTo,
        code: value,
      });
      if (signingIn) return;
    } catch (checkError) {
      message = getErrorMessage(checkError, WRONG_CODE_MESSAGE);
    }
    track("auth_failed");
    setError(message);
    setIsBusy(false);
  };

  if (sentTo === undefined)
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendCode(normalizeEmail(email));
        }}
      >
        <Stack gap="sm">
          <TextInput
            type="email"
            name="email"
            label="Email"
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            size="md"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
              setError(undefined);
            }}
            error={error}
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            variant="light"
            loading={isBusy}
          >
            Email me a code
          </Button>
        </Stack>
      </form>
    );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void checkCode(code);
      }}
    >
      <Stack gap="sm">
        <Text size="sm">
          We sent a {SIGN_IN_CODE_LENGTH}-digit code to <b>{sentTo}</b>. It
          works for {SIGN_IN_CODE_LIFETIME_MINUTES} minutes.
        </Text>
        <TextInput
          name="code"
          label="Code"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          size="md"
          styles={{
            input: {
              fontSize: 24,
              letterSpacing: "0.4em",
              textAlign: "center",
            },
          }}
          value={code}
          onChange={(event) => {
            const digits = codeDigits(event.currentTarget.value);
            setCode(digits);
            setError(undefined);
            // Phones fill the whole code in at once, so go straight on
            if (digits.length === SIGN_IN_CODE_LENGTH) void checkCode(digits);
          }}
          error={error}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isBusy}
          disabled={code.length !== SIGN_IN_CODE_LENGTH}
        >
          Sign in
        </Button>
        <Group justify="center" gap="xs">
          <Button
            variant="subtle"
            size="compact-sm"
            onClick={() => {
              setSentTo(undefined);
              setCode("");
              setError(undefined);
            }}
          >
            Use a different email
          </Button>
          <Button
            variant="subtle"
            size="compact-sm"
            disabled={resendIn > 0 || isBusy}
            onClick={() => void sendCode(sentTo)}
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
