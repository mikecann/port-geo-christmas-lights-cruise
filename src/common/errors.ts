import { useCallback, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import type { ReactMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

const getMessage = (error: unknown) => {
  if (typeof error === "string") return error;

  if (error instanceof ConvexError) {
    if (typeof error.data === "string") return error.data;
    if (typeof error.data === "object" && "message" in error.data)
      return error.data.message;
    return "An unexpected error occurred";
  }

  if (error && typeof error === "object") {
    if (
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    )
      return (error as { message: string }).message;

    if ("error" in error) {
      const nested = (error as { error?: unknown }).error;
      if (
        nested &&
        typeof nested === "object" &&
        "message" in nested &&
        typeof (nested as { message?: unknown }).message === "string"
      )
        return (nested as { message: string }).message;
    }
  }
  return "An unexpected error occurred";
};

export const useApiErrorHandler = () => {
  return useCallback((error: unknown, title?: string) => {
    const message = getMessage(error);
    console.error(`APIError${title ? ` from ${title}` : ""}: `, message);
    notifications.show({
      title: "Error",
      message,
      color: "red",
    });
  }, []);
};

export const useErrorHandler = () => {
  return useCallback((error: unknown, title?: string) => {
    const message = getMessage(error);
    console.error(`Error${title ? ` from ${title}` : ""}: `, message);
    notifications.show({
      title: "Error",
      message,
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
  const onApiError = useApiErrorHandler();
  const [inFlightCount, setInFlightCount] = useState(0);

  const handler = useMemo(() => {
    const wrap = (m: ReactMutation<Mutation>): VoidReactMutation<Mutation> => {
      const invoke = (...args: OptionalRestArgs<Mutation>): void => {
        setInFlightCount((prev) => prev + 1);
        void m(...args)
          .catch((err: unknown) => {
            onApiError(err);
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
  }, [callback, onApiError]);

  const isSaving = useMemo(() => inFlightCount > 0, [inFlightCount]);
  return useMemo(() => [handler, isSaving], [handler, isSaving]);
};
