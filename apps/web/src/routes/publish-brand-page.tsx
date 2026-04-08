import { useQuery, useQueryClient } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { FileImageIcon, SendHorizonalIcon, SparklesIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

const BRAND_DESCRIPTION_MAX_LENGTH = 500;
const BRAND_SLUG_PATTERN = /^[a-z0-9-]+$/;

export function PublishBrandPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["brand-application-edit", editId],
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing edit id");
      }
      return apiClient.getBrandApplication(editId);
    },
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const item = detailQuery.data.item;
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description ?? "");
    setLogo(item.logoUrl ? { id: item.id, url: item.logoUrl } : null);
  }, [detailQuery.data?.item]);

  function openLogoPicker() {
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
  }

  const slugValid = BRAND_SLUG_PATTERN.test(slug.trim());

  return (
    <PublishShell
      description="填写品牌信息并提交。通过后即可在发布飞行器时从品牌列表中选择。"
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
            <SitePanelBody className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[144px_minmax(0,1fr)] md:items-start">
                <button
                  className="group relative flex h-36 w-full items-center justify-center overflow-hidden rounded-[1rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-accent/24"
                  onClick={openLogoPicker}
                  type="button"
                >
                  {logo ? (
                    <>
                      <img alt={logo.fileName ?? "brand logo"} className="h-full w-full object-cover" src={logo.url} />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/0 opacity-0 transition-opacity duration-200 group-hover:bg-slate-950/40 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-black/55 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm">
                          <FileImageIcon className="size-4 shrink-0" />
                          {isUploading ? "上传中..." : "点击更换 Logo"}
                        </span>
                      </div>
                      <span
                        className="absolute right-2 top-2 z-10 inline-flex size-7 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLogo(null);
                        }}
                      >
                        <XIcon className="size-3.5" />
                      </span>
                    </>
                  ) : (
                    <div className="space-y-2 text-center">
                      <FileImageIcon className="mx-auto size-7" />
                      <div>{isUploading ? "上传中..." : "点击上传 Logo"}</div>
                      <div className="text-xs">可选</div>
                    </div>
                  )}
                </button>

                <div className="space-y-4">
                  <Input
                    onChange={(event) => setName(event.target.value)}
                    placeholder="品牌名称"
                    value={name}
                  />
                  <Input
                    aria-invalid={slug.trim().length > 0 && !slugValid ? "true" : undefined}
                    onChange={(event) =>
                      setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48))
                    }
                    placeholder="请输入英文 slug"
                    value={slug}
                  />
                  {!slugValid && slug.trim().length > 0 ? (
                    <div className="text-xs text-destructive">slug 仅支持小写英文字母、数字和连字符</div>
                  ) : null}
                </div>
              </div>

              <div className="relative">
                <Textarea
                  className="min-h-36 resize-none pb-8"
                  maxLength={BRAND_DESCRIPTION_MAX_LENGTH}
                  onChange={(event) => setDescription(event.target.value.slice(0, BRAND_DESCRIPTION_MAX_LENGTH))}
                  placeholder="可补充品牌定位、产品线或官网等，便于我们核对"
                  value={description}
                />
                <div className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {description.length}/{BRAND_DESCRIPTION_MAX_LENGTH}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.publishAircraft}>返回飞行器投稿</Link>
              </Button>
              <Button
                disabled={
                  !name.trim() ||
                  !slug.trim() ||
                  !slugValid ||
                  !description.trim() ||
                  isUploading ||
                  isSubmitting
                }
                onClick={() => {
                  if (
                    !promptLogin({
                      title: "登录后才能提交品牌申请",
                      description: "登录后即可提交，我们会在审核通过后把品牌加入可选列表。"
                    })
                  ) {
                    return;
                  }

                  setError(null);
                  setIsSubmitting(true);
                  const payload = {
                    slug: slug.trim(),
                    name: name.trim(),
                    logoUrl: logo?.url ?? null,
                    description: description.trim()
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
            <div className="text-xl font-semibold">发布机型前可先登记品牌</div>
            <p className="text-sm leading-6 text-panel-highlight-foreground/86">
              通过后，在「发布飞行器」里搜索品牌即可选用；与填写机型参数互不干扰，也可先备好品牌再投稿机型。
            </p>
          </SitePanelBody>
        </SitePanel>
      }
      title="申请品牌"
    />
  );
}
