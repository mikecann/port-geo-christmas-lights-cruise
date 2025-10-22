import { useAuthActions } from "@convex-dev/auth/react";
import { Button, Stack, TextInput, Checkbox } from "@mantine/core";
import { useState } from "react";

/**
 * Test-only page for authenticating users in E2E tests.
 * This should only be accessible when IS_TEST is true.
 */
export function TestAuthPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("test@example.com");
  const [name, setName] = useState("Test User");
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isCompetitionAdmin, setIsCompetitionAdmin] = useState(false);
  const [status, setStatus] = useState<string>("");

  return (
    <Stack p="md" maw={400} mx="auto">
      <h1>Test Authentication</h1>
      <p>This page is only available in test environments.</p>

      <TextInput
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        data-testid="test-auth-email"
      />

      <TextInput
        label="Name"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        data-testid="test-auth-name"
      />

      <Checkbox
        label="System Admin"
        checked={isSystemAdmin}
        onChange={(e) => setIsSystemAdmin(e.currentTarget.checked)}
        data-testid="test-auth-system-admin"
      />

      <Checkbox
        label="Competition Admin"
        checked={isCompetitionAdmin}
        onChange={(e) => setIsCompetitionAdmin(e.currentTarget.checked)}
        data-testid="test-auth-competition-admin"
      />

      <Button
        onClick={() => {
          setStatus("Authenticating...");
          signIn("testing", {
            email,
            name,
            isSystemAdmin: isSystemAdmin.toString(),
            isCompetitionAdmin: isCompetitionAdmin.toString(),
          })
            .then(() => setStatus("Authenticated!"))
            .catch((error) => setStatus(`Error: ${error.message}`));
        }}
        data-testid="test-auth-submit"
      >
        Authenticate
      </Button>

      {status && <div data-testid="test-auth-status">{status}</div>}
    </Stack>
  );
}
