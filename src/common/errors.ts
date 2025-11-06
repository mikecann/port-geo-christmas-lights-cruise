import { useCallback, useMemo, useState } from "react";
import { notifications } from "@mantine/notifications";
import { ConvexError } from "convex/values";
import { useMutation } from "convex/react";
import type { ReactMutation } from "convex/react";
import type { FunctionReference, OptionalRestArgs } from "convex/server";

/**
 * Extracts a user-friendly message from an error, stripping technical prefixes.
 * Removes patterns like "[CONVEX A(...)]", "Uncaught Error:", etc.
 */
const extractFriendlyMessage = (message: string): string => {
  // Remove Convex function call prefixes like "[CONVEX A(my/entries:submit)]"
  let friendly = message.replace(/\[CONVEX [^\]]+\]/g, "").trim();

  // Remove Request ID prefixes like "[Request ID: ...]"
  friendly = friendly.replace(/\[Request ID: [^\]]+\]/g, "").trim();

  // Remove "Server Error" prefix
  friendly = friendly.replace(/^Server Error\s+/i, "").trim();

  // Remove repeated "Uncaught Error:" prefixes
  friendly = friendly.replace(/^(Uncaught Error:\s*)+/i, "").trim();

  // Remove "Called by client" suffix
  friendly = friendly.replace(/\s+Called by client$/i, "").trim();

  return friendly || "An unexpected error occurred";
};

const getMessage = (error: unknown): string => {
  let rawMessage: string;

  if (typeof error === "string") {
    rawMessage = error;
  } else if (error instanceof ConvexError) {
    if (typeof error.data === "string") {
      rawMessage = error.data;
    } else if (
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string"
    ) {
      rawMessage = error.data.message;
    } else {
      return "An unexpected error occurred";
    }
  } else if (error && typeof error === "object") {
    if (
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      rawMessage = (error as { message: string }).message;
    } else if ("error" in error) {
      const nested = (error as { error?: unknown }).error;
      if (
        nested &&
        typeof nested === "object" &&
        nested !== null &&
        "message" in nested &&
        typeof (nested as { message?: unknown }).message === "string"
      ) {
        rawMessage = (nested as { message: string }).message;
      } else {
        return "An unexpected error occurred";
      }
    } else {
      return "An unexpected error occurred";
    }
  } else {
    return "An unexpected error occurred";
  }

  return extractFriendlyMessage(rawMessage);
};

export const useApiErrorHandler = () => {
  return useCallback((error: unknown, title?: string) => {
    const friendlyMessage = getMessage(error);
    // Log the full error details for debugging
    console.error(`APIError${title ? ` from ${title}` : ""}: `, error);
    // Show only the friendly message to the user
    notifications.show({
      title: "Error",
      message: friendlyMessage,
      color: "red",
    });
  }, []);
};

export const useErrorHandler = () => {
  return useCallback((error: unknown, title?: string) => {
    const friendlyMessage = getMessage(error);
    // Log the full error details for debugging
    console.error(`Error${title ? ` from ${title}` : ""}: `, error);
    // Show only the friendly message to the user
    notifications.show({
      title: "Error",
      message: friendlyMessage,
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
