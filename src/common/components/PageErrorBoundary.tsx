import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Stack, Text, Title } from "@mantine/core";

interface Props {
  children: ReactNode;
  // Changing it (the route's href) clears the error, so the nav still works
  resetKey: string;
}

interface State {
  // A flag rather than the error itself, since anything can be thrown
  hasError: boolean;
  resetKey: string;
}

// Without this, an error while rendering a page (a page that failed to load,
// say) unmounts the whole app and leaves a blank screen until a reload
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, resetKey: this.props.resetKey };

  // Cleared during the render that navigates, rather than after it commits,
  // so a page that fails straight away is caught and reported only once
  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.resetKey === state.resetKey) return null;
    return { hasError: false, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    // React no longer reports errors an error boundary catches to window,
    // so Sentry's onerror handler would never see them. reportError() sends
    // it there without this needing the lazily loaded Sentry SDK.
    if (typeof reportError === "function") reportError(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
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
