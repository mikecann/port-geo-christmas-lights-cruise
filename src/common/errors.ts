import { useCallback, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import type { ReactMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

// Convex hides plain Error messages in production, so only a ConvexError's
// message is meant for people to read. Strings are messages the app wrote.
const getMessage = (error: unknown): string => {
  if (typeof error === "string") return error;
  if (error instanceof ConvexError) {
    if (typeof error.data === "string") return error.data;
    if (
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string"
    )
      return error.data.message;
  }
  return GENERIC_MESSAGE;
};

export const useErrorHandler = () => {
  return useCallback((error: unknown, title?: string) => {
    // Log the full error details for debugging
    console.error(`Error${title ? ` from ${title}` : ""}: `, error);
    notifications.show({
      title: "Error",
      message: getMessage(error),
      color: "red",
    });
  }, []);
};

type VoidReactMutation<M extends FunctionReference<"mutation">> = {
  (...args: OptionalRestArgs<M>): void;
  withOptimisticUpdate: (
    update: Parameters<ReactMutation<M>["withOptimisticUpdate"]>[0],
  ) => VoidReactMutation<M>;
};

export const useErrorCatchingMutation = <
  Mutation extends FunctionReference<"mutation">,
>(
  mutation: Mutation,
): [VoidReactMutation<Mutation>, boolean] => {
  const callback = useMutation(mutation);
  const onError = useErrorHandler();
  const [inFlightCount, setInFlightCount] = useState(0);

  const handler = useMemo(() => {
    const wrap = (m: ReactMutation<Mutation>): VoidReactMutation<Mutation> => {
      const invoke = (...args: OptionalRestArgs<Mutation>): void => {
        setInFlightCount((prev) => prev + 1);
        void m(...args)
          .catch((err: unknown) => {
            onError(err);
          })
          .finally(() => {
            setInFlightCount((prev) => prev - 1);
          });
      };

      const withOptimisticUpdate = (
        update: Parameters<typeof m.withOptimisticUpdate>[0],
      ) => wrap(m.withOptimisticUpdate(update));

      return Object.assign(invoke, { withOptimisticUpdate });
    };

    return wrap(callback);
  }, [callback, onError]);

  const isSaving = useMemo(() => inFlightCount > 0, [inFlightCount]);
  return useMemo(() => [handler, isSaving], [handler, isSaving]);
};
