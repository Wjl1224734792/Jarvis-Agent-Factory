import { APP_ROUTES } from "@feijia/shared";
import {
  LogOutIcon,
  RadarIcon,
  SparklesIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UserAvatar } from "@/components/ui/user-avatar";
import { getAvatarImage } from "@/lib/aviation-media";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="flex h-9 max-w-[10rem] items-center gap-2 rounded-full border border-border/45 bg-muted/35 px-3 text-[0.78rem] text-muted-foreground">
        <RadarIcon className="size-3.5 shrink-0 text-primary" />
        <span className="truncate">正在恢复会话</span>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex items-center gap-2">
        <Badge className="hidden rounded-full px-2.5 py-0.5 text-[0.7rem] lg:inline-flex" variant="outline">
          游客模式
        </Badge>
        <Button asChild className="h-9 rounded-full px-4 text-[0.8rem]" size="sm" variant="default">
          <Link to={APP_ROUTES.webLogin}>
            <SparklesIcon data-icon="inline-start" />
            登录 / 注册
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <Link
        className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent/55 hover:text-foreground md:hidden"
        to={APP_ROUTES.webProfile}
      >
        <UserAvatar
          className="size-8"
          displayName={user.displayName}
          size="sm"
          src={user.avatarUrl?.trim() ? user.avatarUrl : getAvatarImage(user.id)}
        />
        <span className="sr-only">进入个人中心</span>
      </Link>

      <Link
        className="hidden h-9 max-w-[11rem] items-center gap-2 rounded-full px-1.5 transition hover:bg-accent/50 md:flex lg:max-w-[13rem]"
        to={APP_ROUTES.webProfile}
      >
        <UserAvatar
          displayName={user.displayName}
          size="sm"
          src={user.avatarUrl?.trim() ? user.avatarUrl : getAvatarImage(user.id)}
        />
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate text-[0.82rem] font-medium leading-tight text-foreground">
            {user.displayName}
          </span>
          <span className="mt-0.5 hidden text-[0.68rem] leading-none text-muted-foreground lg:block">
            {user.role === "admin" ? "进入个人中心" : "飞友"}
          </span>
        </span>
      </Link>

      <span aria-hidden className="mx-0.5 hidden h-6 w-px shrink-0 bg-border/55 sm:mx-1 md:block" />

      <Button
        className="size-9 shrink-0 rounded-full text-muted-foreground hover:bg-accent/55 hover:text-foreground sm:size-10"
        onClick={() => {
          void apiClient
            .logout()
            .then(() => {
              setAnonymous();
              void navigate(APP_ROUTES.feedHome);
            })
            .catch((error: unknown) => {
              setError(error instanceof Error ? error.message : "退出登录失败");
            });
        }}
        size="icon"
        type="button"
        variant="ghost"
      >
        <LogOutIcon className="size-[1.15rem]" />
        <span className="sr-only">退出登录</span>
      </Button>
    </div>
  );
}
