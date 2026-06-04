import { useCallback } from "react";
import { useError } from "../contexts/ErrorContext";
import { getApiErrorMessage } from "../lib/apiErrorPresentation";

type RunOptions = {
  /** Show toast via ErrorContext (default: true). */
  toast?: boolean;
  /** Called after normalization; return false to skip default toast. */
  onError?: (err: unknown) => void | boolean;
};

/**
 * Wrap async UI actions: one try/catch, optional loading, consistent API errors.
 */
export function useAsyncAction() {
  const { handleApiError } = useError();

  const run = useCallback(
    async <T>(
      context: string,
      fn: () => Promise<T>,
      options?: RunOptions,
    ): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (err) {
        if (options?.onError) {
          const handled = options.onError(err);
          if (handled === false) return undefined;
        }
        if (options?.toast !== false) {
          handleApiError(err, context);
        }
        return undefined;
      }
    },
    [handleApiError],
  );

  return {
    run,
    handleApiError,
    getErrorMessage: getApiErrorMessage,
  };
}
