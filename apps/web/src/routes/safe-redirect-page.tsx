import { AlertTriangleIcon, ExternalLinkIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { isExternalHttpUrl, normalizeSafeRedirectFromPath } from "@/lib/web-routes";

function getExternalTarget(rawTarget: string | null) {
  if (!rawTarget || typeof window === "undefined") {
    return null;
  }
  if (!isExternalHttpUrl(rawTarget, window.location.origin)) {
    return null;
  }
  return new URL(rawTarget, window.location.origin);
}

export function SafeRedirectPage() {
  const [searchParams] = useSearchParams();
  const target = searchParams.get("target");
  const from = searchParams.get("from");
  const targetUrl = useMemo(() => getExternalTarget(target), [target]);
  const backToPath = useMemo(() => normalizeSafeRedirectFromPath(from), [from]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-2xl items-center px-4 py-10 md:px-6">
      <div className="w-full rounded-2xl border border-border/70 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-center gap-2 text-orange-600">
          <AlertTriangleIcon className="size-5" />
          <span className="text-sm font-medium">外链安全确认</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground md:text-2xl">即将离开飞架社区</h1>
        {targetUrl ? (
          <>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              你将前往第三方站点，请确认目标地址可信，谨防钓鱼或恶意页面。
            </p>
            <div className="mt-4 rounded-xl border border-border/70 bg-surface-1 p-3">
              <div className="text-xs text-muted-foreground">目标域名</div>
              <div className="mt-1 break-all text-sm font-medium text-foreground">{targetUrl.host}</div>
              <div className="mt-1 break-all text-xs text-muted-foreground">{targetUrl.toString()}</div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to={backToPath}>返回站内</Link>
              </Button>
              <Button asChild variant="hero">
                <a
                  data-skip-safe-redirect="true"
                  href={targetUrl.toString()}
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  继续访问
                  <ExternalLinkIcon className="size-4" />
                </a>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">链接无效或不属于外部 http/https 地址。</p>
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link to="/">返回首页</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
