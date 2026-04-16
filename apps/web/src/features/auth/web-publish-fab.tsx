import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "./auth-store";
import { webPublishMenuEntries } from "./web-nav-config";
import { useLoginPrompt } from "./use-login-prompt";

export function WebPublishFab() {
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="fixed right-4 z-[45] max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-6">
      <div className="relative" ref={rootRef}>
        <Button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="打开发布菜单"
          className="size-14 rounded-full shadow-[var(--shadow-float)]"
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
          <PlusIcon className="size-6" />
        </Button>

        {open ? (
          <div className="absolute right-0 bottom-[calc(100%+0.45rem)] z-50 w-[10.5rem] rounded-[0.95rem] bg-background/96 p-1.5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.34)] backdrop-blur">
            <div className="space-y-0.5">
              {webPublishMenuEntries.map((entry) => (
                <Link
                  className="flex h-8 items-center justify-center rounded-[0.8rem] px-3 text-center text-[0.82rem] font-medium text-foreground/84 transition hover:bg-secondary/55 hover:text-foreground"
                  key={entry.to}
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
                  to={entry.to}
                >
                  <span className="truncate">{entry.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
