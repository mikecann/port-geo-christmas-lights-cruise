import { Stack, Text, Anchor } from "@mantine/core";
import { Authenticated, Unauthenticated } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { routes } from "../../routes";
import EntrySignupUnavailableButton from "../../competition/EntrySignupUnavailableButton";

export default function FooterNavigation() {
  const competition = useQuery(api.public.competitions.current, {});

  return (
    <Stack gap="md">
      <Text fw={600} c="white" size="lg">
        Navigation
      </Text>
      <Stack gap="xs">
        <Anchor
          component="a"
          {...routes.home().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Home
        </Anchor>
        <Anchor
          component="a"
          {...routes.entries().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          View Entries
        </Anchor>
        <Anchor
          component="a"
          {...routes.map().link}
          c="gray.4"
          td="none"
          style={{ fontSize: 14 }}
        >
          Map View
        </Anchor>
        {competition?.entriesOpen === false ? (
          <EntrySignupUnavailableButton link />
        ) : (
          <>
            <Authenticated>
              <Anchor
                component="a"
                {...routes.myEntries().link}
                c="gray.4"
                td="none"
                style={{ fontSize: 14 }}
              >
                Enter Competition
              </Anchor>
            </Authenticated>
            <Unauthenticated>
              <Anchor
                component="a"
                {...routes.signin({ returnTo: routes.myEntries().href }).link}
                c="gray.4"
                td="none"
                style={{ fontSize: 14 }}
              >
                Enter Competition
              </Anchor>
            </Unauthenticated>
          </>
        )}
      </Stack>
    </Stack>
  );
}
