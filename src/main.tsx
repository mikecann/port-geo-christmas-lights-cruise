import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { RouteProvider } from "./routes.ts";
import "@mantine/core/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/carousel/styles.css";
import "./index.css";
import App from "./App.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { MeProvider } from "./auth/MeProvider.tsx";
import { ConfirmationProvider } from "./common/components/confirmation/ConfirmationProvider.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const theme = createTheme({
  // Add custom theme overrides if needed
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found..");

createRoot(rootElement).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <ConfirmationProvider>
        <ConvexAuthProvider client={convex}>
          <RouteProvider>
            <MeProvider>
              <App />
            </MeProvider>
          </RouteProvider>
        </ConvexAuthProvider>
      </ConfirmationProvider>
    </MantineProvider>
  </StrictMode>,
);
