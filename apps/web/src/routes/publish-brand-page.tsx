import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { APP_ROUTES } from "@feijia/shared";
import { FileImageIcon, SendHorizonalIcon, SparklesIcon, XIcon } from "lucide-react";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { apiClient } from "@/lib/api-client";

type UploadedLogo = {
  id: string;
  url: string;
  fileName?: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function PublishBrandPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const detailQuery = useQuery({
    queryKey: ["brand-application-edit", editId],
    queryFn: () => apiClient.getBrandApplication(editId!),
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    setName(item.name);
    setDescription(item.description ?? "");
    setLogo(item.logoUrl ? { id: item.id, url: item.logoUrl } : null);
  }, [detailQuery.data?.item]);

  return (
    <PublishShell
      description="独立提交品牌申请，审核通过后才会进入飞行器发布可选品牌列表。"
      eyebrow="品牌申请"
      main={
        <>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>品牌申请提交失败</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {detailQuery.data?.item.rejectionReason ? (
            <Alert>
              <AlertTitle>驳回原因</AlertTitle>
              <AlertDescription>{detailQuery.data.item.rejectionReason}</AlertDescription>
            </Alert>
          ) : null}

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <Input
                onChange={(event) => setName(event.target.value)}
                placeholder="品牌名称"
                value={name}
              />
              <Input readOnly value={slugify(name)} placeholder="自动生成 slug" />
              <Textarea
                className="min-h-36"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="补充品牌定位、产品范围或你希望审核方了解的信息"
                value={description}
              />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-foreground">品牌图标</div>
                <Button
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (!file) {
                        return;
                      }
                      setIsUploading(true);
                      setError(null);
                      void apiClient
                        .uploadPostImage(file)
                        .then((uploaded) => {
                          setLogo({
                            id: uploaded.item.id,
                            url: uploaded.item.url,
                            fileName: uploaded.item.fileName
                          });
                        })
                        .catch((reason: unknown) => {
                          setError(reason instanceof Error ? reason.message : "Logo 上传失败");
                        })
                        .finally(() => {
                          setIsUploading(false);
                        });
                    };
                    input.click();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <FileImageIcon data-icon="inline-start" />
                  {isUploading ? "上传中..." : "上传 Logo"}
                </Button>
              </div>

              {logo ? (
                <div className="relative overflow-hidden rounded-[1rem] border border-border/70">
                  <img alt={logo.fileName ?? "brand logo"} className="h-56 w-full object-cover" src={logo.url} />
                  <button
                    className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-black/55 text-white"
                    onClick={() => setLogo(null)}
                    type="button"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center rounded-[1rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground">
                  可选，建议提供品牌 Logo 提高审核效率
                </div>
              )}
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.publishAircraft}>返回飞行器投稿</Link>
              </Button>
              <Button
                disabled={!name.trim() || isUploading || isSubmitting}
                onClick={() => {
                  if (
                    !promptLogin({
                      title: "登录后才能提交品牌申请",
                      description: "品牌申请会进入独立审核队列。"
                    })
                  ) {
                    return;
                  }

                  setError(null);
                  setIsSubmitting(true);
                  const payload = {
                    slug: slugify(name),
                    name: name.trim(),
                    logoUrl: logo?.url ?? null,
                    description: description.trim() || null
                  };
                  void (editId
                    ? apiClient.updateBrandApplication(editId, payload)
                    : apiClient.createBrandApplication(payload))
                    .then(() => {
                      void queryClient.invalidateQueries({ queryKey: ["self-profile-content"] });
                      void navigate(APP_ROUTES.publishAircraft, { replace: true });
                    })
                    .catch((reason: unknown) => {
                      setError(reason instanceof Error ? reason.message : "品牌申请提交失败");
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                type="button"
                variant="hero"
              >
                <SendHorizonalIcon data-icon="inline-start" />
                {isSubmitting ? "提交中..." : "提交品牌申请"}
              </Button>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      aside={
        <SitePanel variant="highlight">
          <SitePanelBody className="space-y-4">
            <SparklesIcon className="size-6" />
            <div className="text-xl font-semibold">独立审核</div>
            <p className="text-sm leading-6 text-panel-highlight-foreground/86">
              品牌申请与机型投稿彻底分离。通过后会进入品牌库，之后发布飞行器时即可直接搜索选择。
            </p>
          </SitePanelBody>
        </SitePanel>
      }
      title="申请品牌"
    />
  );
}
