import { useState } from "react";
import {
  Anchor,
  Button,
  Code,
  Group,
  Loader,
  Stack,
  Text,
} from "@mantine/core";
import { IconRotateClockwise } from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useErrorHandler } from "../../../common/errors";
import { routes } from "../../../routes";

// Live: a timer appears here as soon as its delivery fails, and goes when it's
// rearmed. The query reads Convex's record of scheduled functions, so nothing
// here has to ask for a refresh.
export default function FailedTimers() {
  const timers = useQuery(api.admin.system.machines.failedTimers, {});
  const rearm = useMutation(api.admin.system.machines.rearmTimer);
  const onApiError = useErrorHandler();
  const [rearming, setRearming] = useState<string>();

  if (timers === undefined) return <Loader size="sm" />;

  if (timers.length === 0)
    return (
      <Text size="sm" c="dimmed">
        None. Every timer that has fired has worked.
      </Text>
    );

  return (
    <Stack gap="sm" align="flex-start">
      {timers.map((timer) => {
        const key = `${timer.machine}-${timer.id}-${timer.event}`;
        return (
          <Group key={key} gap="sm">
            <Text size="sm">
              <Code>{timer.event}</Code> on {timer.machine}{" "}
              {timer.machine === "entry" ? (
                <Anchor
                  size="sm"
                  {...routes.adminMachines({ entry: timer.id }).link}
                >
                  {timer.id}
                </Anchor>
              ) : (
                timer.id
              )}
              , due {new Date(timer.dueAt).toLocaleString()}
            </Text>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconRotateClockwise size={14} />}
              loading={rearming === key}
              onClick={() => {
                setRearming(key);
                rearm({
                  machine: timer.machine,
                  id: timer.id,
                  event: timer.event,
                })
                  .catch(onApiError)
                  .finally(() => setRearming(undefined));
              }}
            >
              Rearm
            </Button>
          </Group>
        );
      })}
    </Stack>
  );
}
