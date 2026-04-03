import { APP_ROUTES } from "@feijia/shared";
import { CheckCircle2Icon, Clock3Icon, FileSearchIcon, TrophyIcon } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { PublishFormSkeleton } from "@/components/page-skeletons";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import { getEditorialImage } from "../lib/aviation-media";
import { PublishShell } from "@/components/publish-shell";
import type { PublishStatusKind } from "@/lib/web-routes";

type PublishStatusState = {
  title?: string;
  description?: string;
  imageUrl?: string | null;
  secondaryImageUrls?: string[];
};

export function PublishStatusPage() {
  const params = useParams<{ kind: PublishStatusKind; id: string }>();
  const location = useLocation();
  const kind = params.kind;
  const id = params.id ?? "";
  const state = (location.state ?? {}) as PublishStatusState;

  const submissionQuery = useQuery({
    queryKey: ["aircraft-submission", id],
    queryFn: () => apiClient.getAircraftSubmission(id),
    enabled: kind === "aircraft" && Boolean(id)
  });

  if (!kind || !id) {
    return null;
  }

  if (kind === "aircraft" && submissionQuery.isLoading) {
    return <PublishFormSkeleton />;
  }

  const aircraft = submissionQuery.data?.item ?? null;
  const aircraftView = aircraft as
    | (typeof aircraft & {
        category?: { name?: string | null } | null;
        brand?: { name?: string | null } | null;
        proposedBrandName?: string | null;
      })
    | null;
  const title =
    state.title ??
    (kind === "aircraft"
      ? aircraft?.modelName
      : kind === "ranking"
        ? "榜单已发布"
        : kind === "article"
          ? "文章已提交"
          : "动态已提交");
  const coverImage =
    state.imageUrl ??
    aircraft?.coverImageUrl ??
    getEditorialImage(`publish-status-${kind}-${id}`);

  const isPublished = kind === "ranking";

  return (
    <PublishShell
      aside={
        <SitePanel variant={isPublished ? "highlight" : "muted"}>
          <SitePanelBody className="space-y-4">
            {isPublished ? <TrophyIcon className="size-6" /> : <Clock3Icon className="size-6 text-primary" />}
            <div className="space-y-2">
              <div className="text-xl font-semibold">
                {isPublished ? "内容已发布" : "已提交待审核"}
              </div>
              <p className={isPublished ? "text-sm leading-6 text-panel-highlight-foreground/88" : "text-sm leading-6 text-muted-foreground"}>
                {isPublished
                  ? "你现在可以进入榜单详情继续补充内容。"
                  : "审核前不会进入公开详情页，也不会再触发 404。"}
              </p>
            </div>
            <div className="rounded-[0.85rem] border border-border/70 bg-white/80 p-3 text-sm text-foreground/78">
              编号：{id}
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      description={isPublished ? "创建结果" : "投稿结果"}
      eyebrow={kind === "ranking" ? "已发布" : "待审核"}
      main={
        <>
          <SitePanel>
            <SitePanelBody className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-slate-100">
                <img alt={title} className="h-full min-h-[220px] w-full object-cover" src={coverImage} />
              </div>

              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-1 px-3 py-1.5 text-[0.76rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {isPublished ? <CheckCircle2Icon className="size-4 text-primary" /> : <Clock3Icon className="size-4 text-primary" />}
                  {isPublished ? "已发布" : "待审核"}
                </div>

                <div className="space-y-2">
                  <h1 className="text-[1.8rem] leading-[1.05] font-semibold tracking-[-0.04em] text-foreground">
                    {title}
                  </h1>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {kind === "ranking"
                      ? "榜单已保存为公开内容。"
                      : kind === "aircraft"
                      ? `${aircraftView?.category?.name ?? "飞行器"}投稿已进入审核队列。`
                        : "提交成功，等待审核后公开。"}
                  </p>
                </div>

                {kind === "aircraft" && aircraft ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="rounded-[0.8rem] border border-border bg-surface-1 px-3 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">分类</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{aircraft.category?.name ?? "--"}</div>
                    </div>
                    <div className="rounded-[0.8rem] border border-border bg-surface-1 px-3 py-3">
                      <div className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">品牌</div>
                      <div className="mt-1 text-sm font-medium text-foreground">
                        {aircraftView?.brand?.name ?? aircraftView?.proposedBrandName ?? "--"}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  {kind === "ranking" ? (
                    <Button asChild variant="hero">
                      <Link to={APP_ROUTES.rankingDetail.replace(":id", id)}>进入榜单详情</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="hero">
                      <Link to={APP_ROUTES.feedHome}>返回首页</Link>
                    </Button>
                  )}
                  <Button asChild variant="outline">
                    <Link to={kind === "aircraft" ? APP_ROUTES.models : kind === "ranking" ? APP_ROUTES.rankings : APP_ROUTES.feedHome}>
                      {kind === "aircraft" ? "查看机型库" : kind === "ranking" ? "返回榜单" : "继续浏览"}
                    </Link>
                  </Button>
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          {submissionQuery.isError ? (
            <SitePanel>
              <SitePanelBody className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileSearchIcon className="size-4 text-primary" />
                投稿已提交，详情暂时无法加载。
              </SitePanelBody>
            </SitePanel>
          ) : null}
        </>
      }
      title={isPublished ? "发布完成" : "提交完成"}
    />
  );
}
