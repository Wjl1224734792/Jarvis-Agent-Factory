import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { BrandApplication } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { Clock3Icon, FileImageIcon, SendHorizonalIcon, SparklesIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublishBrandPageSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "@/features/auth/use-login-prompt";
import { apiClient } from "@/lib/api-client";
import { clearDraftSnapshot, loadDraftSnapshot, saveDraftSnapshot } from "@/lib/uploads/draft-store";
import {
  restorePersistedPreviewAsset,
  revokePreviewAsset
} from "@/lib/uploads/local-preview-assets";
import { buildBrandApplicationSuccessView } from "./publish-brand-page-helpers";

type UploadedLogo = {
  id: string;
  url: string;
  fileName?: string;
  file?: File;
  isLocal?: boolean;
};

const BRAND_DESCRIPTION_MAX_LENGTH = 500;
const BRAND_SLUG_PATTERN = /^[a-z0-9-]+$/;
const BRAND_DRAFT_KEY = "feijia:brand-draft";

type BrandDraftData = {
  name: string;
  slug: string;
  description: string;
  logo: UploadedLogo | null;
};

function BrandApplicationSuccessState(props: {
  application: BrandApplication;
  logoUrl: string | null;
}) {
  const view = buildBrandApplicationSuccessView(props.application);

  return (
    <PublishShell
      aside={
        <SitePanel variant="muted">
          <SitePanelBody className="space-y-4">
            <Clock3Icon className="size-6 text-primary" />
            <div className="space-y-2">
              <div className="text-xl font-semibold">{view.title}</div>
              <p className="text-sm leading-6 text-muted-foreground">
                审核前不会进入品牌搜索结果，也不会在飞行器投稿页里公开可选。
              </p>
            </div>
            <div className="rounded-[0.85rem] border border-border/70 bg-white/80 p-3 text-sm text-foreground/78">
              申请编号：{props.application.id}
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      description="品牌申请结果"
      eyebrow={view.eyebrow}
      main={
        <SitePanel>
          <SitePanelBody className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
            <div className="overflow-hidden rounded-[0.9rem] border border-border/70 bg-surface-1">
              {props.logoUrl ? (
                <img alt={props.application.name} className="h-full min-h-[220px] w-full object-cover" src={props.logoUrl} />
              ) : (
                <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  暂未上传品牌 Logo
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-1 px-3 py-1.5 text-[0.76rem] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Clock3Icon className="size-4 text-primary" />
                {view.statusLabel}
              </div>

              <div className="space-y-2">
                <h1 className="text-[1.8rem] leading-[1.05] font-semibold tracking-[-0.04em] text-foreground">
                  {view.title}
                </h1>
                <p className="text-sm leading-6 text-muted-foreground">{view.description}</p>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[0.8rem] border border-border bg-surface-1 px-3 py-3">
                  <div className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">品牌名称</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{props.application.name}</div>
                </div>
                <div className="rounded-[0.8rem] border border-border bg-surface-1 px-3 py-3">
                  <div className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground">品牌标识</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{props.application.slug ?? "自动生成"}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="hero">
                  <Link to={APP_ROUTES.feedHome}>{view.primaryActionLabel}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={APP_ROUTES.publishAircraft}>{view.secondaryActionLabel}</Link>
                </Button>
              </div>
            </div>
          </SitePanelBody>
        </SitePanel>
      }
      title="提交完成"
    />
  );
}

/**
 * Handles the brand-application route for draft, edit and submitted states.
 *
 * Boundaries:
 * - Manages the page-local draft and logo preview so users can resume or fix a
 *   rejected application without re-entering the full form.
 * - Switches between editable and submitted-success presentations, but leaves
 *   moderation status, storage and validation authority to `apiClient`.
 * - Keeps the route scoped to brand application UX; aircraft submission logic
 *   stays in its own publish entry.
 */
export function PublishBrandPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const submittedId = searchParams.get("submitted");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<UploadedLogo | null>(null);
  const [submittedApplication, setSubmittedApplication] = useState<BrandApplication | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isUploading = false;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["brand-application-edit", editId],
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing edit id");
      }
      return apiClient.getBrandApplication(editId);
    },
    enabled: Boolean(editId) && !submittedId
  });

  const submittedQuery = useQuery({
    queryKey: ["brand-application-submitted", submittedId],
    queryFn: () => {
      if (!submittedId) {
        throw new Error("Missing submitted id");
      }
      return apiClient.getBrandApplication(submittedId);
    },
    enabled: Boolean(submittedId) && !submittedApplication
  });

  useEffect(() => {
    if (editId || submittedId) {
      return;
    }
    void loadDraftSnapshot<BrandDraftData>(BRAND_DRAFT_KEY)
      .then((snapshot) => {
        if (!snapshot) {
          return;
        }
        const draft = snapshot.data;
        const restoredLogo = restorePersistedPreviewAsset(draft.logo ?? null);
        setName(draft.name ?? "");
        setSlug(draft.slug ?? "");
        setDescription(draft.description ?? "");
        setLogo(restoredLogo?.asset ?? null);
      })
      .catch(() => {
        // noop
      });
  }, [editId, submittedId]);

  useEffect(() => {
    if (!detailQuery.data?.item || submittedApplication || submittedId) {
      return;
    }

    const item = detailQuery.data.item;
    setName(item.name);
    setSlug(item.slug ?? "");
    setDescription(item.description ?? "");
    setLogo(item.logoUrl ? { id: item.id, url: item.logoUrl } : null);
  }, [detailQuery.data?.item, submittedApplication, submittedId]);

  useEffect(() => {
    if (editId || submittedId) {
      return;
    }
    void saveDraftSnapshot<BrandDraftData>({
      key: BRAND_DRAFT_KEY,
      version: 1,
      updatedAt: Date.now(),
      data: {
        name,
        slug,
        description,
        logo
      },
      filesBySlot: {}
    });
  }, [description, editId, logo, name, slug, submittedId]);

  useEffect(() => {
    return () => {
      revokePreviewAsset(logo);
    };
  }, [logo]);

  function openLogoPicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        return;
      }
      setError(null);
      setLogo((current) => {
        revokePreviewAsset(current);
        return {
          id: `local-${crypto.randomUUID()}`,
          url: URL.createObjectURL(file),
          fileName: file.name,
          file,
          isLocal: true
        };
      });
    };
    input.click();
  }

  const slugValid = BRAND_SLUG_PATTERN.test(slug.trim());
  const successApplication = submittedApplication ?? submittedQuery.data?.item ?? null;

  if (submittedId && submittedQuery.isLoading && !successApplication) {
    return <PublishBrandPageSkeleton />;
  }

  if (successApplication) {
    return (
      <BrandApplicationSuccessState
        application={successApplication}
        logoUrl={successApplication.logoUrl ?? logo?.url ?? null}
      />
    );
  }

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

          {submittedQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>品牌申请状态加载失败</AlertTitle>
              <AlertDescription>{submittedQuery.error.message}</AlertDescription>
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
              <div className="grid gap-4 md:grid-cols-[144px_minmax(0,1fr)] md:items-stretch">
                <button
                  className="group relative flex min-h-36 w-full items-center justify-center overflow-hidden rounded-[1rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-accent/24 md:h-full md:min-h-0"
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
                      <div className="text-xs">必填</div>
                    </div>
                  )}
                </button>

                <div className="min-w-0 space-y-4">
                  <Input onChange={(event) => setName(event.target.value)} placeholder="品牌名称" value={name} />
                  <Input
                    aria-invalid={slug.trim().length > 0 && !slugValid ? "true" : undefined}
                    onChange={(event) =>
                      setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48))
                    }
                    placeholder="英文标识（选填，留空自动生成）"
                    value={slug}
                  />
                  {!slugValid && slug.trim().length > 0 ? (
                    <div className="text-xs text-destructive">标识仅支持小写英文字母、数字和连字符</div>
                  ) : null}
                  {!slug.trim() ? (
                    <div className="text-xs text-muted-foreground">留空将根据品牌名称自动生成唯一标识</div>
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
                  (slug.trim().length > 0 && !slugValid) ||
                  !description.trim() ||
                  !logo ||
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
                  if (!logo) {
                    setError("请先上传封面。");
                    return;
                  }

                  setError(null);
                  setIsSubmitting(true);
                  void (async () => {
                    let logoUrl = logo?.url ?? null;
                    if (logo?.file) {
                      const uploaded = await apiClient.uploadPostImage(logo.file);
                      logoUrl = uploaded.item.url;
                    }
                    const payload = {
                      slug: slug.trim() || null,
                      name: name.trim(),
                      logoUrl,
                      description: description.trim()
                    };
                    return editId
                      ? apiClient.updateBrandApplication(editId, payload)
                      : apiClient.createBrandApplication(payload);
                  })()
                    .then((response) => {
                      void clearDraftSnapshot(BRAND_DRAFT_KEY);
                      void queryClient.invalidateQueries({ queryKey: ["self-profile-content"] });
                      if (editId) {
                        void queryClient.invalidateQueries({ queryKey: ["brand-application-edit", editId] });
                      }
                      setSubmittedApplication(response.item);
                      void navigate(
                        editId
                          ? `${APP_ROUTES.publishBrand}?edit=${editId}&submitted=${response.item.id}`
                          : `${APP_ROUTES.publishBrand}?submitted=${response.item.id}`,
                        { replace: true }
                      );
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
