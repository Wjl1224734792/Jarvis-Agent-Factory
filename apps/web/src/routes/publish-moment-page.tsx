import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ImageIcon, SendHorizonalIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  SitePage,
  SitePageDescription,
  SitePageEyebrow,
  SitePageHead,
  SitePageTitle,
  SitePanel,
  SitePanelBody
} from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";

export function PublishMomentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  return (
    <SitePage className="gap-6">
      <SitePageHead>
        <SitePageEyebrow>Moment Publishing</SitePageEyebrow>
        <SitePageTitle className="text-[2.8rem]">发布动态</SitePageTitle>
        <SitePageDescription>面向飞友圈的轻量发布页，先兼容现有帖子接口，后续由后端接入 moment 类型。</SitePageDescription>
      </SitePageHead>

      <SitePanel>
        <SitePanelBody className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="size-4 text-primary" />
            当前先复用现有图片与帖子接口，等待 moment 字段落地
          </div>

          <Textarea
            className="min-h-20 rounded-none"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="一句话标题（可选）"
            value={title}
          />

          <Textarea
            className="min-h-[240px] rounded-none"
            onChange={(event) => setContent(event.target.value)}
            placeholder="写下你的飞行动态、试飞记录或即时观察..."
            value={content}
          />

          {error ? (
            <Alert variant="destructive">
              <AlertTitle>动态发布失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button
              disabled={!content.trim() || isPublishing}
              onClick={() => {
                setError(null);
                setIsPublishing(true);

                // TODO: backend_implementer 接入 moment type
                void apiClient
                  .createPost({
                    title: title.trim() || "飞行动态",
                    content,
                    imageIds: []
                  })
                  .then((payload) => {
                    void queryClient.invalidateQueries({ queryKey: ["circle-feed"] });
                    navigate(APP_ROUTES.postDetail.replace(":id", payload.item.id));
                  })
                  .catch((reason: unknown) => {
                    setError(reason instanceof Error ? reason.message : "动态发布失败");
                  })
                  .finally(() => {
                    setIsPublishing(false);
                  });
              }}
              type="button"
              variant="hero"
            >
              <SendHorizonalIcon data-icon="inline-start" />
              {isPublishing ? "发布中..." : "发布动态"}
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>
    </SitePage>
  );
}
