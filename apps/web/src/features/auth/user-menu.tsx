import { APP_ROUTES } from "@feijia/shared";
import { RadarIcon, SparklesIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "./auth-store";

export function UserMenu() {
  const status = useAuthStore((state) => state.status);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-9 max-w-[10rem] items-center gap-2 rounded-full border border-border/45 bg-muted/35 px-3 text-[0.78rem] text-muted-foreground">
        <RadarIcon className="size-3.5 shrink-0 text-primary" />
        <span className="truncate">正在恢复会话</span>
      </div>
    );
  }

  if (status !== "authenticated") {
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

  return null;
}
