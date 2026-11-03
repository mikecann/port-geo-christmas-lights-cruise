import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Stack, Text, Title } from "@mantine/core";

interface Props {
  children: ReactNode;
  // Changing it (the route's href) clears the error, so the nav still works
  resetKey: string;
}

interface State {
  error: unknown;
}

// Without this, an error while rendering a page (a page that failed to load,
// say) unmounts the whole app and leaves a blank screen until a reload
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    // React no longer reports errors an error boundary catches to window,
    // so Sentry's onerror handler would never see them. reportError() sends
    // it there without this needing the lazily loaded Sentry SDK.
    if (typeof reportError === "function") reportError(error);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey)
      this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Stack align="center" gap="md" py="xl" ta="center">
        <Title order={2}>This page didn't load</Title>
        <Text c="dimmed">
          Reloading usually fixes it. If it keeps happening, check your
          connection.
        </Text>
        <Button onClick={() => location.reload()}>Reload the page</Button>
      </Stack>
    );
  }
}
