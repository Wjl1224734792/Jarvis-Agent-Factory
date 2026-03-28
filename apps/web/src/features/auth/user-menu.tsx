import { APP_ROUTES } from "@feijia/shared";
import {
  BellIcon,
  LogOutIcon,
  RadarIcon,
  Settings2Icon,
  SparklesIcon,
  UserRoundIcon
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "./auth-store";

export function UserMenu() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const setError = useAuthStore((state) => state.setError);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-full border border-border/80 bg-card/88 px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <RadarIcon className="size-4 text-primary" />
        Restoring session
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex items-center gap-3">
        <Badge className="hidden rounded-full px-3 py-1 lg:inline-flex" variant="outline">
          Guest mode
        </Badge>
        <Button asChild className="rounded-2xl px-5" size="lg">
          <Link to={APP_ROUTES.webLogin}>
            <SparklesIcon data-icon="inline-start" />
            Log in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/88 px-2.5 py-1.5 shadow-sm md:flex">
        <Avatar className="ring-2 ring-white/80" size="lg">
          <AvatarFallback>{user.displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="pr-1 text-left sm:flex sm:flex-col">
          <span className="text-sm font-medium text-foreground">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {user.role === "admin" ? "Admin Session" : "Flight Member"}
          </span>
        </span>
      </div>

      <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-card/84 p-1 shadow-sm lg:flex">
        {[
          { to: APP_ROUTES.notifications, label: "Alerts", icon: BellIcon },
          { to: APP_ROUTES.webProfile, label: "Profile", icon: UserRoundIcon },
          { to: APP_ROUTES.webSettings, label: "Settings", icon: Settings2Icon }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  buttonVariants({
                    size: "sm",
                    variant: isActive ? "panel" : "ghost"
                  }),
                  "rounded-full px-3.5"
                )
              }
              key={item.to}
              to={item.to}
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          );
        })}
      </div>

      <Button
        className="rounded-full"
        onClick={() => {
          void apiClient
            .logout()
            .then(() => {
              setAnonymous();
              navigate(APP_ROUTES.feedHome);
            })
            .catch((error: unknown) => {
              setError(error instanceof Error ? error.message : "Log out failed");
            });
        }}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <LogOutIcon />
        <span className="sr-only">Log out</span>
      </Button>
    </div>
  );
}
