import { APP_ROUTES } from "@feijia/shared";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "./auth-store";
import { webBottomNavItems } from "./web-nav-config";
import { useLoginPrompt } from "./use-login-prompt";

export function WebBottomNav() {
  const authStatus = useAuthStore((state) => state.status);
  const promptLogin = useLoginPrompt();

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/92 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl xl:hidden"
    >
      <div className="mx-auto flex h-14 max-w-3xl items-stretch justify-around gap-0.5 px-1">
        {webBottomNavItems.map((item) => {
          const Icon = item.icon;
          const isProfile = item.to === APP_ROUTES.webProfile;

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.65rem] font-semibold transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground/90"
                )
              }
              key={item.to}
              onClick={(event) => {
                if (!isProfile || authStatus === "authenticated") {
                  return;
                }

                event.preventDefault();
                promptLogin({
                  title: "登录后查看",
                  description: "登录后可查看个人主页与设置。"
                });
              }}
              to={item.to}
            >
              <Icon className="size-[1.35rem] shrink-0" />
              <span className="max-w-full truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
