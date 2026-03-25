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
          <Link to="/login">
            <SparklesIcon data-icon="inline-start" />
            登录 / 注册
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-border/80 bg-card/88 px-2.5 py-1.5 shadow-sm">
        <Avatar size="lg">
          <AvatarFallback>{user.displayName.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="hidden pr-1 text-left sm:flex sm:flex-col">
          <span className="text-sm font-medium text-foreground">{user.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {user.role === "admin" ? "Admin Session" : "Flight Member"}
          </span>
        </span>
      </div>

      <Button
        className="rounded-full"
        onClick={() => {
          void apiClient
            .logout()
            .then(() => {
              setAnonymous();
              navigate("/home");
            })
            .catch((error: unknown) => {
              setError(error instanceof Error ? error.message : "退出失败");
            });
        }}
        size="icon-lg"
        type="button"
        variant="outline"
      >
        <LogOutIcon />
        <span className="sr-only">退出登录</span>
      </Button>
    </div>
  );
}
