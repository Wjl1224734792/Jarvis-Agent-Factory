import { QueryClient } from "@tanstack/react-query";
import { getWebErrorRetryable } from "./api-client";

const nonRetriableStatusPattern = /\b(?:400|401|403|404|409|422)\b/;
const nonRetriableMessagePattern =
  /(not found|missing|invalid|required|forbidden|unauthorized|already|not allowed)/i;

export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (failureCount >= 2) {
    return false;
  }

  if (!(error instanceof Error)) {
    return true;
  }

  const retryable = getWebErrorRetryable(error);
  if (typeof retryable === "boolean") {
    return retryable;
  }

  return !(
    nonRetriableStatusPattern.test(error.message) || nonRetriableMessagePattern.test(error.message)
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 15_000
    }
  }
});
