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
      <div className="flex items-center gap-3 rounded-full border border-border/80 bg-card/88 px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <RadarIcon className="size-4 text-primary" />
        正在恢复会话
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex items-center gap-3">
        <Badge className="hidden rounded-full px-3 py-1 lg:inline-flex" variant="outline">
          游客模式
        </Badge>
        <Button asChild className="rounded-2xl px-5" size="lg">
          <Link to={APP_ROUTES.webLogin}>
            <SparklesIcon data-icon="inline-start" />
            登录 / 注册
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-card/88 shadow-sm transition hover:border-primary/30 md:hidden"
        to={APP_ROUTES.webProfile}
      >
        <UserAvatar
          className="size-8.5 ring-2 ring-white/80"
          displayName={user.displayName}
          size="sm"
          src={user.avatarUrl?.trim() ? user.avatarUrl : getAvatarImage(user.id)}
        />
        <span className="sr-only">进入个人中心</span>
      </Link>

      <div className="hidden items-center gap-2 rounded-full bg-card/88 px-2.5 py-1.5 md:flex">
        <Link
          className="flex items-center gap-2 rounded-full pr-1 transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          to={APP_ROUTES.webProfile}
        >
          <UserAvatar
            className="ring-2 ring-white/80"
            displayName={user.displayName}
            size="lg"
            src={user.avatarUrl?.trim() ? user.avatarUrl : getAvatarImage(user.id)}
          />
          <span className="text-left sm:flex sm:flex-col">
            <span className="text-sm font-medium text-foreground">{user.displayName}</span>
            <span className="text-xs text-muted-foreground">
              {user.role === "admin" ? "进入个人中心" : "飞友身份"}
            </span>
          </span>
        </Link>
      </div>

      <Button
        className="rounded-full"
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
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        <LogOutIcon />
        <span className="sr-only">退出登录</span>
      </Button>
    </div>
  );
}
