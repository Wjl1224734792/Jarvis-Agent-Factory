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
    <div className="fixed right-4 z-[45] max-xl:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] xl:bottom-6">
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
          className="size-11 rounded-full shadow-[var(--shadow-float)] xl:size-14"
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
          variant="hero"
        >
          <PlusIcon className="size-5 xl:size-6" />
        </Button>

        {open ? (
          <div className="absolute right-0 bottom-full z-50 w-[10.5rem] rounded-[0.95rem] bg-background/96 p-1.5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)] backdrop-blur">
            <div className="space-y-0.5">
              {webPublishMenuEntries.map((entry) => {
                // action 类型菜单项：点击触发回调而非路由跳转
                if ("action" in entry && entry.action) {
                  return (
                    <button
                      className="flex h-8 w-full items-center justify-center rounded-[0.8rem] px-3 text-center text-[0.82rem] font-medium text-foreground/84 transition hover:bg-secondary/55 hover:text-foreground"
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
                    className="flex h-8 items-center justify-center rounded-[0.8rem] px-3 text-center text-[0.82rem] font-medium text-foreground/84 transition hover:bg-secondary/55 hover:text-foreground"
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
