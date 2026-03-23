import { APP_ROUTES } from "@feijia/shared";
import { LogOutIcon, RadarIcon, SparklesIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/80 px-3 py-2 shadow-sm backdrop-blur">
        <RadarIcon className="text-primary" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">恢复会话中</span>
          <span className="text-xs text-muted-foreground">正在同步身份状态</span>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="outline" className="hidden md:inline-flex">
          游客模式
        </Badge>
        <Button asChild size="lg">
          <Link to={APP_ROUTES.webLogin}>
            <SparklesIcon data-icon="inline-start" />
            登录 / 注册
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button asChild variant="outline" size="lg" className="rounded-lg px-3.5">
        <Link to={APP_ROUTES.webProfile}>
          <Avatar size="lg">
            <AvatarFallback>{user.displayName.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:flex sm:flex-col">
            <span className="text-sm font-medium text-foreground">{user.displayName}</span>
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {user.role === "admin" ? "Admin Session" : "Flight Member"}
            </span>
          </span>
        </Link>
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="rounded-lg"
        onClick={() => {
          void apiClient
            .logout()
            .then(() => {
              setAnonymous();
              navigate(APP_ROUTES.feedHome);
            })
            .catch((error: unknown) => {
              setError(error instanceof Error ? error.message : "退出失败");
            });
        }}
        type="button"
      >
        <LogOutIcon data-icon="inline-start" />
        <span className="hidden sm:inline">退出</span>
      </Button>
    </div>
  );
}
