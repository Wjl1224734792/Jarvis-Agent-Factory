import { useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ImageIcon, ListTreeIcon, SaveIcon, SendHorizonalIcon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";
import { getEditorialImage } from "../lib/aviation-media";

const fallbackCategories = ["资讯", "测评", "航拍", "技术", "指南"] as const;

export function PublishArticlePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState(getEditorialImage("article-publish"));
  const [category, setCategory] = useState<string>(fallbackCategories[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  return (
    <SitePage className="gap-6">
      <SitePageHead>
        <SitePageEyebrow>Article Publishing</SitePageEyebrow>
        <SitePageTitle className="text-[2.8rem]">发布文章</SitePageTitle>
        <SitePageDescription>基础富文本能力先以内建工具栏和预览骨架承接，后续接入后端文章分类与 HTML 存储。</SitePageDescription>
      </SitePageHead>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <SitePanel>
          <SitePanelBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 border-b border-border/70 pb-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <ListTreeIcon className="size-4 text-primary" />
                富文本工具栏骨架
              </span>
              <span className="inline-flex items-center gap-2">
                <ImageIcon className="size-4 text-primary" />
                封面图预览
              </span>
            </div>

            <Input
              className="h-14 rounded-none border-x-0 border-t-0 px-0 text-3xl font-semibold shadow-none focus-visible:ring-0"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="输入文章标题"
              value={title}
            />

            <div className="flex flex-wrap gap-2">
              {fallbackCategories.map((item) => (
                <button
                  className={`border-b-2 px-0 py-2 text-sm transition-colors ${category === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  key={item}
                  onClick={() => setCategory(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>

            <Textarea
              className="min-h-28 rounded-none"
              onChange={(event) => setSummary(event.target.value)}
              placeholder="文章导语 / 摘要"
              value={summary}
            />

            <Textarea
              className="min-h-[360px] rounded-none"
              onChange={(event) => setContent(event.target.value)}
              placeholder="这里先以段落文本承接，后端文章富文本字段到位后再切正式存储。"
              value={content}
            />

            {error ? (
              <Alert variant="destructive">
                <AlertTitle>文章发布失败</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline">
                <SaveIcon data-icon="inline-start" />
                保存草稿
              </Button>
              <Button
                disabled={!title.trim() || !content.trim() || isPublishing}
                onClick={() => {
                  setError(null);
                  setIsPublishing(true);

                  // TODO: backend_implementer 接入 article type / contentCategoryId / contentHtml
                  void apiClient
                    .createPost({
                      title,
                      content: [summary.trim(), content.trim()].filter(Boolean).join("\n\n"),
                      imageIds: []
                    })
                    .then((payload) => {
                      void queryClient.invalidateQueries({ queryKey: ["home-shell-feed"] });
                      navigate(APP_ROUTES.postDetail.replace(":id", payload.item.id));
                    })
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "文章发布失败");
                    })
                    .finally(() => {
                      setIsPublishing(false);
                    });
                }}
                type="button"
                variant="hero"
              >
                <SendHorizonalIcon data-icon="inline-start" />
                {isPublishing ? "发布中..." : "发布文章"}
              </Button>
            </div>
          </SitePanelBody>
        </SitePanel>

        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Article Preview</div>
            <img alt="cover preview" className="h-48 w-full object-cover" src={coverUrl} />
            <div className="text-xs text-primary">{category}</div>
            <div className="text-2xl font-semibold text-foreground">{title || "文章标题预览"}</div>
            <p className="text-sm leading-7 text-muted-foreground">{summary || "文章摘要会显示在这里。"}</p>
            <Button asChild className="w-full" variant="outline">
              <Link to={APP_ROUTES.feedHome}>返回首页</Link>
            </Button>
          </SitePanelBody>
        </SitePanel>
      </div>
    </SitePage>
  );
}
