import { useCallback, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import type { ReactMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

// Convex hides plain Error messages in production, so only a ConvexError's
// message is meant for people to read. Strings are messages the app wrote.
export const getErrorMessage = (
  error: unknown,
  fallback = GENERIC_MESSAGE,
): string => {
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
  return fallback;
};

export const useErrorHandler = () => {
  return useCallback((error: unknown, title?: string) => {
    // Log the full error details for debugging
    console.error(`Error${title ? ` from ${title}` : ""}: `, error);
    notifications.show({
      title: "Error",
      message: getErrorMessage(error),
      color: "red",
    });
  }, []);
};

// Resolves once the mutation settles: true if it worked, false if it failed
// (the error has already been shown). It never rejects.
type CatchingReactMutation<M extends FunctionReference<"mutation">> = {
  (...args: OptionalRestArgs<M>): Promise<boolean>;
  withOptimisticUpdate: (
    update: Parameters<ReactMutation<M>["withOptimisticUpdate"]>[0],
  ) => CatchingReactMutation<M>;
};

export const useErrorCatchingMutation = <
  Mutation extends FunctionReference<"mutation">,
>(
  mutation: Mutation,
): [CatchingReactMutation<Mutation>, boolean] => {
  const callback = useMutation(mutation);
  const onError = useErrorHandler();
  const [inFlightCount, setInFlightCount] = useState(0);

  const handler = useMemo(() => {
    const wrap = (
      m: ReactMutation<Mutation>,
    ): CatchingReactMutation<Mutation> => {
      const invoke = (...args: OptionalRestArgs<Mutation>) => {
        setInFlightCount((prev) => prev + 1);
        return m(...args)
          .then(() => true)
          .catch((err: unknown) => {
            onError(err);
            return false;
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
