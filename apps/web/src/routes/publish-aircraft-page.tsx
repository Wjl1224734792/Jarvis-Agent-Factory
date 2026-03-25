import { APP_ROUTES } from "@feijia/shared";
import { CheckCircle2Icon, FileImageIcon, PlaneTakeoffIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getModelImage } from "../lib/aviation-media";

export function PublishAircraftPage() {
  return (
    <SitePage className="gap-6">
      <SitePageHead>
        <SitePageEyebrow>Aircraft Submission</SitePageEyebrow>
        <SitePageTitle className="text-[2.8rem]">申请添加机型</SitePageTitle>
        <SitePageDescription>前端先落地投稿页结构。后端投稿/审核接口尚未接入，本页当前为可交付骨架。</SitePageDescription>
      </SitePageHead>

      <Alert>
        <AlertTitle>等待后端 aircraft submissions 接口</AlertTitle>
        <AlertDescription>本页已按投稿审核流预留结构，当前提交按钮不执行真实写入。</AlertDescription>
      </Alert>

      <SiteGrid className="xl:grid-cols-[minmax(0,1fr)_300px]" variant="default">
        <div className="space-y-6">
          <SitePanel>
            <SitePanelBody className="grid gap-4 md:grid-cols-2">
              <Input placeholder="品牌名称，例如 DJI" />
              <Input placeholder="机型名称，例如 M350 RTK" />
              <Input placeholder="飞行器类型，例如 无人机" />
              <Input placeholder="动力类型，例如 纯电" />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold text-foreground">封面与媒体资料</div>
              <div className="grid gap-4 md:grid-cols-[180px_repeat(3,minmax(0,1fr))]">
                <div className="flex h-44 items-center justify-center border border-dashed border-border/70 bg-muted/20">
                  <FileImageIcon className="size-8 text-muted-foreground" />
                </div>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="flex h-28 items-center justify-center border border-dashed border-border/70 bg-muted/20" key={index}>
                    <FileImageIcon className="size-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <Input placeholder="视频演示 URL（可选）" />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold text-foreground">参数项</div>
              <div className="grid gap-3 md:grid-cols-3">
                <Input placeholder="最大航程" />
                <Input placeholder="巡航速度" />
                <Input placeholder="最大载荷" />
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-lg font-semibold text-foreground">机型介绍</div>
              <Textarea className="min-h-48 rounded-none" placeholder="描述机型特点、应用场景和核心参数..." />
              <div className="flex flex-wrap justify-end gap-3">
                <Button asChild type="button" variant="outline">
                  <Link to={APP_ROUTES.models}>取消</Link>
                </Button>
                <Button disabled type="button" variant="hero">
                  提交审核
                </Button>
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>

        <SiteRail>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Preview</div>
              <img alt="model preview" className="h-48 w-full object-cover" src={getModelImage("mini-4-pro", "electric")} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {[
                  { label: "审核状态", value: "默认自动通过" },
                  { label: "资料完整度", value: "65%" }
                ].map((item) => (
                  <div className="border border-border/60 p-3" key={item.label}>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-foreground">{item.value}</div>
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="space-y-4">
              <CheckCircle2Icon className="size-6" />
              <div className="text-2xl font-semibold">投稿规范</div>
              <p className="text-sm leading-7 text-panel-highlight-foreground/84">优先使用清晰封面图、完整参数和可验证的品牌/机型信息。</p>
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
