import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateCircleModal } from "@/features/circles/create-circle-modal";
import { useCreateCircleDialogStore } from "@/features/circles/create-circle-dialog-store";
import { CreatePostModal } from "@/features/circles/create-post-modal";
import { useCreatePostDialogStore } from "@/features/circles/create-post-dialog-store";
import { useAuthStore } from "./auth-store";
import { webPublishMenuEntries } from "./web-nav-config";
import { useLoginPrompt } from "./use-login-prompt";

export function WebPublishFab() {
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openCreateCircleDialog = useCreateCircleDialogStore((s) => s.openDialog);
  const openCreatePostDialog = useCreatePostDialogStore((s) => s.openDialog);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const el = rootRef.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function handleMenuAction(action: string) {
    if (action === "create-circle") {
      openCreateCircleDialog();
    }
    if (action === "create-post") {
      openCreatePostDialog();
    }
  }

  return (
    <div className="fixed right-4 z-[45] max-xl:bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] xl:bottom-5">
      <div
        className="relative pb-2"
        ref={rootRef}
        onMouseEnter={() => { if (authStatus === "authenticated") setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
      >
        <Button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="打开发布菜单"
          className="size-10 rounded-full shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-float)] xl:size-11"
          onClick={() => {
            if (authStatus !== "authenticated") {
              promptLogin({
                title: "登录后才能发布",
                description: "发布文章、动态、飞行器和榜单前请先登录。"
              });
              return;
            }

            setOpen((value) => !value);
          }}
          size="icon"
          type="button"
          variant="default"
        >
          <PlusIcon className="size-5" />
        </Button>

        {open ? (
          <div className="absolute right-0 bottom-full z-50 mb-2 w-[9.5rem] overflow-hidden rounded-xl border border-border/60 bg-card p-1 shadow-[var(--shadow-panel)]">
            <div className="space-y-0.5">
              {webPublishMenuEntries.map((entry) => {
                // action 类型菜单项：点击触发回调而非路由跳转
                if ("action" in entry && entry.action) {
                  return (
                    <button
                      className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[0.8rem] font-medium text-foreground/80 transition-colors hover:bg-accent/70 hover:text-foreground"
                      key={entry.action}
                      onClick={() => {
                        if (authStatus !== "authenticated") {
                          promptLogin({
                            title: "登录后才能发布",
                            description: "发布文章、动态、飞行器和榜单前请先登录。"
                          });
                          return;
                        }
                        setOpen(false);
                        handleMenuAction(entry.action);
                      }}
                      type="button"
                    >
                      <span className="truncate">{entry.label}</span>
                    </button>
                  );
                }

                // to 类型菜单项：路由跳转
                const toPath = entry.to;
                if (!toPath) return null;
                return (
                  <Link
                    className="flex h-9 items-center gap-2 rounded-lg px-3 text-[0.8rem] font-medium text-foreground/80 transition-colors hover:bg-accent/70 hover:text-foreground"
                    key={toPath}
                    onClick={(event) => {
                      if (authStatus !== "authenticated") {
                        event.preventDefault();
                        promptLogin({
                          title: "登录后才能发布",
                          description: "发布文章、动态、飞行器和榜单前请先登录。"
                        });
                        return;
                      }

                      setOpen(false);
                    }}
                    rel="noopener noreferrer"
                    target="_blank"
                    to={toPath}
                  >
                    <span className="truncate">{entry.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <CreateCircleModal />
      <CreatePostModal />
    </div>
  );
}
