import { Skeleton } from "@/components/ui/skeleton";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";

export function PublishArticlePageSkeleton() {
  return (
    <PublishShell
      eyebrow="文章"
      title="发布文章"
      main={
        <SitePanel>
          <SitePanelBody className="space-y-6">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-48 w-full" />
          </SitePanelBody>
        </SitePanel>
      }
    />
  );
}

export function PublishMomentPageSkeleton() {
  return (
    <PublishShell
      eyebrow="动态"
      title="发布动态"
      main={
        <SitePanel>
          <SitePanelBody className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </SitePanelBody>
        </SitePanel>
      }
    />
  );
}

export function RankingEditorPageSkeleton() {
  return (
    <SitePanel>
      <SitePanelBody className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </SitePanelBody>
    </SitePanel>
  );
}
