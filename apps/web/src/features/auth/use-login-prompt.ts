import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuthRequiredDialogStore } from "./auth-required-dialog-store";
import { useAuthStore } from "./auth-store";

type PromptOptions = {
  title?: string;
  description?: string;
  redirectTo?: string;
};

export function useLoginPrompt() {
  const authStatus = useAuthStore((state) => state.status);
  const location = useLocation();
  const openDialog = useAuthRequiredDialogStore((state) => state.openDialog);

  return useCallback(
    (options?: PromptOptions) => {
      if (authStatus === "authenticated") {
        return true;
      }

      openDialog({
        title: options?.title,
        description: options?.description,
        redirectTo: options?.redirectTo ?? `${location.pathname}${location.search}${location.hash}`
      });

      return false;
    },
    [authStatus, location.hash, location.pathname, location.search, openDialog]
  );
}
