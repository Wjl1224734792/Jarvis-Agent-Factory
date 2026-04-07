import { APP_ROUTES, buildLoginRedirectUrl, resolveSafeRedirectPath } from "@feijia/shared";
import { LockKeyholeIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "./auth-store";
import { useAuthRequiredDialogStore } from "./auth-required-dialog-store";

export function AuthRequiredDialog() {
  const navigate = useNavigate();
  const authStatus = useAuthStore((state) => state.status);
  const open = useAuthRequiredDialogStore((state) => state.open);
  const title = useAuthRequiredDialogStore((state) => state.title);
  const description = useAuthRequiredDialogStore((state) => state.description);
  const redirectTo = useAuthRequiredDialogStore((state) => state.redirectTo);
  const closeDialog = useAuthRequiredDialogStore((state) => state.closeDialog);

  useEffect(() => {
    if (authStatus === "authenticated" && open) {
      closeDialog();
    }
  }, [authStatus, closeDialog, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/48 px-4 py-8 backdrop-blur-md">
      <SitePanel className="w-full max-w-[420px]" variant="floating">
        <SitePanelBody className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
                <LockKeyholeIcon className="size-4.5" />
              </div>
              <div>
                <div className="text-lg font-semibold text-foreground">{title}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{description}</div>
              </div>
            </div>

            <Button onClick={closeDialog} size="icon-sm" type="button" variant="ghost">
              <XIcon className="size-4" />
              <span className="sr-only">关闭</span>
            </Button>
          </div>

          <div className="flex justify-end gap-3">
            <Button onClick={closeDialog} size="sm" type="button" variant="outline">
              稍后再说
            </Button>
            <Button
              onClick={() => {
                closeDialog();
                void navigate(
                  buildLoginRedirectUrl(APP_ROUTES.webLogin, {
                    pathname: resolveSafeRedirectPath({
                      candidate: redirectTo,
                      fallbackPath: APP_ROUTES.feedHome,
                      blockedPaths: [APP_ROUTES.webLogin]
                    })
                  })
                );
              }}
              size="sm"
              type="button"
              variant="hero"
            >
              去登录
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>
    </div>
  );
}
