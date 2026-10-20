import { useState } from "react";
import { Anchor, Button, Code, Group, Stack, Text } from "@mantine/core";
import { IconRefresh, IconRotateClockwise } from "@tabler/icons-react";
import type { FunctionReturnType } from "convex/server";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useErrorHandler } from "../../../common/errors";
import { routes } from "../../../routes";

type FailedTimer = FunctionReturnType<
  typeof api.admin.system.machines.failedTimers
>[number];

// Finding them is a mutation, so it runs when asked rather than live
export default function FailedTimers() {
  const check = useMutation(api.admin.system.machines.failedTimers);
  const rearm = useMutation(api.admin.system.machines.rearmTimer);
  const onApiError = useErrorHandler();
  const [timers, setTimers] = useState<FailedTimer[]>();
  const [isChecking, setIsChecking] = useState(false);
  const [rearming, setRearming] = useState<string>();

  const refresh = async () => {
    setIsChecking(true);
    await check({})
      .then(setTimers)
      .catch(onApiError)
      .finally(() => setIsChecking(false));
  };

  return (
    <Stack gap="sm" align="flex-start">
      <Button
        variant="default"
        leftSection={<IconRefresh size={16} />}
        loading={isChecking}
        onClick={() => void refresh()}
      >
        Check
      </Button>
      {timers?.length === 0 && (
        <Text size="sm" c="dimmed">
          None. Every timer that has fired has worked.
        </Text>
      )}
      {timers?.map((timer) => {
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
                  .then(refresh)
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
