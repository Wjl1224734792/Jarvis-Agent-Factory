import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowDownIcon, ArrowUpIcon, CameraIcon, ImagePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublishFormSkeleton } from "@/components/page-skeletons";
import { PublishShell } from "@/components/publish-shell";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLoginPrompt } from "../features/auth/use-login-prompt";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";
import { buildPublishStatusPath } from "../lib/web-routes";

type DraftItem = {
  id: string;
  title: string;
  summary: string;
  imageFileId: string;
  imageUrl: string;
  brandName: string;
  linkedModelSlug: string | null;
};

function emptyDraftItem(): DraftItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    summary: "",
    imageFileId: "",
    imageUrl: "",
    brandName: "",
    linkedModelSlug: null
  };
}

export function RankingEditorPage() {
  const navigate = useNavigate();
  const promptLogin = useLoginPrompt();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const addMode = searchParams.get("add") === "1";
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const itemImageInputRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageFileId, setCoverImageFileId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [itemAddPolicy, setItemAddPolicy] = useState<"public" | "owner">("owner");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [selectedImageItemId, setSelectedImageItemId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ["ranking-editor-models"],
    queryFn: () => apiClient.listModels()
  });
  const detailQuery = useQuery({
    queryKey: ["ranking-detail", editId],
    queryFn: () => {
      if (!editId) {
        throw new Error("Missing ranking id");
      }
      return apiClient.getRankingDetail(editId);
    },
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const ranking = detailQuery.data.item;
    setTitle(ranking.title);
    setDescription(ranking.description);
    setCoverImageFileId(ranking.coverImageFileId ?? "");
    setCoverImageUrl(ranking.coverImageUrl ?? "");
    setItemAddPolicy(ranking.itemAddPolicy);
    setDraftItems(
      ranking.items.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary ?? "",
        imageFileId: item.imageFileId ?? "",
        imageUrl: item.imageUrl ?? "",
        brandName: item.brandName ?? item.linkedModel?.brand.name ?? "",
        linkedModelSlug: item.linkedModel?.slug ?? null
      }))
    );
  }, [detailQuery.data?.item]);

  const selectedModelSlugs = useMemo(
    () => new Set(draftItems.map((item) => item.linkedModelSlug).filter(Boolean)),
    [draftItems]
  );
  const suggestedModels =
    modelsQuery.data?.items
      .filter((model) => !selectedModelSlugs.has(model.slug))
      .filter((model) => {
        const keyword = modelSearch.trim().toLowerCase();
        if (!keyword) {
          return true;
        }

        return (
          model.name.toLowerCase().includes(keyword) ||
          model.brand.name.toLowerCase().includes(keyword) ||
          model.category.name.toLowerCase().includes(keyword)
        );
      })
      .slice(0, 8) ?? [];

  function appendModel(slug: string, name: string, brandName: string, imageUrl: string) {
    setDraftItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        title: name,
        summary: "",
        imageFileId: "",
        imageUrl,
        brandName,
        linkedModelSlug: slug
      }
    ]);
  }

  function appendCustomItem() {
    setDraftItems((items) => [...items, emptyDraftItem()]);
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setDraftItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function moveItem(id: string, direction: "up" | "down") {
    setDraftItems((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) {
        return items;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= items.length) {
        return items;
      }

      const cloned = [...items];
      const [current] = cloned.splice(index, 1);
      cloned.splice(nextIndex, 0, current);
      return cloned;
    });
  }

  async function uploadSingleImage(file: File) {
    const uploaded = await apiClient.uploadRatingTargetImage(file);
    return uploaded.item;
  }

  async function uploadCoverImage(file: File) {
    const uploaded = await apiClient.uploadRankingCoverImage(file);
    return uploaded.item;
  }

  const isFormValid =
    title.trim().length >= 2 &&
    description.trim().length > 0 &&
    draftItems.length > 0 &&
    draftItems.every((item) => item.title.trim().length > 0);

  if (modelsQuery.isLoading || (editId && detailQuery.isLoading)) {
    return <PublishFormSkeleton />;
  }

  return (
    <PublishShell
      description={editId ? "社区榜单编辑" : "社区榜单创建"}
      eyebrow="社区榜单"
      main={
        <>
          {detailQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>榜单数据加载失败</AlertTitle>
              <AlertDescription>{detailQuery.error.message}</AlertDescription>
            </Alert>
          ) : null}

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>榜单提交失败</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
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
              <div className="text-base font-semibold text-foreground">
                {editId ? (addMode ? "新增排行对象" : "编辑榜单") : "创建榜单"}
              </div>
              <Input onChange={(event) => setTitle(event.target.value)} placeholder="榜单标题" value={title} />
              <Textarea
                className="min-h-28"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="榜单简介"
                value={description}
              />
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground/72">新增排行对象权限</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "public", label: "访客可新增" },
                    { value: "owner", label: "仅创建者可新增" }
                  ].map((item) => (
                    <button
                      className={`site-tab-trigger rounded-full border px-3 py-1.5 text-[0.82rem] transition ${
                        itemAddPolicy === item.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 text-foreground/72"
                      }`}
                      key={item.value}
                      onClick={() => setItemAddPolicy(item.value as "public" | "owner")}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-base font-semibold text-foreground">封面</div>
              <button
                className="group relative block w-full overflow-hidden rounded-[0.95rem] border border-dashed border-border/70 bg-card text-left transition hover:border-primary/40"
                onClick={() => coverInputRef.current?.click()}
                type="button"
              >
                {coverImageUrl ? (
                  <>
                    <img
                      alt="ranking cover"
                      className="h-[220px] w-full object-cover"
                      src={coverImageUrl}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-transparent transition group-hover:bg-slate-950/30 group-hover:text-white">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/30 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                        <CameraIcon className="size-4" />
                        {isUploading ? "上传中..." : "点击更换封面"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-[220px] w-full flex-col items-center justify-center gap-3 bg-surface-1 text-muted-foreground">
                    <CameraIcon className="size-8" />
                    <div className="text-sm font-medium text-foreground">
                      {isUploading ? "上传中..." : "点击上传榜单封面"}
                    </div>
                  </div>
                )}
              </button>
              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) {
                    return;
                  }
                  setIsUploading(true);
                  setSubmitError(null);
                  void uploadCoverImage(file)
                    .then((uploaded) => {
                      setCoverImageFileId(uploaded.id);
                      setCoverImageUrl(uploaded.url);
                    })
                    .catch((reason: unknown) => {
                      setSubmitError(reason instanceof Error ? reason.message : "封面上传失败");
                    })
                    .finally(() => setIsUploading(false));
                }}
                ref={coverInputRef}
                type="file"
              />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-foreground">排行对象</div>
                <div className="flex gap-2">
                  <Button onClick={appendCustomItem} size="sm" type="button" variant="outline">
                    <PlusIcon data-icon="inline-start" />
                    添加排行对象
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {draftItems.map((item, index) => (
                  <div className="rounded-[0.9rem] border border-border/70 p-3.5" key={item.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">#{index + 1}</div>
                      <div className="flex gap-1.5">
                        <Button
                          disabled={index === 0}
                          onClick={() => moveItem(item.id, "up")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowUpIcon className="size-4" />
                        </Button>
                        <Button
                          disabled={index === draftItems.length - 1}
                          onClick={() => moveItem(item.id, "down")}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <ArrowDownIcon className="size-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedImageItemId(item.id);
                            itemImageInputRef.current?.click();
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <ImagePlusIcon className="size-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            setDraftItems((items) => items.filter((entry) => entry.id !== item.id));
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-[108px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-[0.8rem] border border-border/70 bg-slate-100">
                        <img
                          alt={item.title || "ranking item"}
                          className="h-[108px] w-full object-cover"
                          src={item.imageUrl || getEditorialImage(`ranking-item-${item.id}`)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Input
                          onChange={(event) => updateItem(item.id, { title: event.target.value })}
                          placeholder="条目标题"
                          value={item.title}
                        />
                        <Input
                          onChange={(event) => updateItem(item.id, { brandName: event.target.value })}
                          placeholder="品牌 / 标签"
                          value={item.brandName}
                        />
                        <Textarea
                          className="min-h-20"
                          onChange={(event) => updateItem(item.id, { summary: event.target.value })}
                          placeholder="一句话摘要"
                          value={item.summary}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <input
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  const targetId = selectedImageItemId;
                  event.target.value = "";
                  if (!file || !targetId) {
                    return;
                  }
                  setIsUploading(true);
                  setSubmitError(null);
                  void uploadSingleImage(file)
                    .then((uploaded) => {
                      updateItem(targetId, { imageFileId: uploaded.id, imageUrl: uploaded.url });
                    })
                    .catch((reason: unknown) => {
                      setSubmitError(reason instanceof Error ? reason.message : "条目图片上传失败");
                    })
                    .finally(() => {
                      setSelectedImageItemId(null);
                      setIsUploading(false);
                    });
                }}
                ref={itemImageInputRef}
                type="file"
              />
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-4">
              <div className="text-base font-semibold text-foreground">从飞行器库添加</div>
              <Input
                onChange={(event) => setModelSearch(event.target.value)}
                placeholder="搜索机型、品牌或分类"
                value={modelSearch}
              />
              <div className="max-h-[28rem] overflow-y-auto pr-1">
                <div className="grid gap-3 md:grid-cols-2">
                  {suggestedModels.map((model, index) => (
                    <button
                      className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-[0.9rem] border border-border/70 p-3 text-left transition hover:border-primary/30 hover:bg-sky-50/55"
                      key={model.id}
                      onClick={() =>
                        appendModel(
                          model.slug,
                          model.name,
                          model.brand.name,
                          getModelImage(model.slug, model.powerType, index)
                        )
                      }
                      type="button"
                    >
                      <img
                        alt={model.name}
                        className="h-[72px] w-full rounded-[0.8rem] object-cover"
                        src={getModelImage(model.slug, model.powerType, index)}
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-semibold text-foreground">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.brand.name}</div>
                        <div className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {model.summary ?? `${model.category.name} / ${model.brand.name}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {suggestedModels.length === 0 ? (
                <div className="rounded-[0.85rem] border border-dashed border-border/70 px-4 py-4 text-sm text-muted-foreground">
                  没有匹配的机型，可直接添加排行对象。
                </div>
              ) : null}
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="flex flex-wrap justify-end gap-3">
              <Button asChild type="button" variant="outline">
                <Link to={APP_ROUTES.rankings}>取消</Link>
              </Button>
              <Button
                disabled={!isFormValid || isSubmitting || isUploading}
                onClick={() => {
                  if (
                    !promptLogin({
                      title: "登录后才能创建榜单",
                      description: "创建社区榜单前请先登录。"
                    })
                  ) {
                    return;
                  }
                  setSubmitError(null);
                  setIsSubmitting(true);
                  const payload = {
                    type: "community",
                    title,
                    description,
                    coverImageFileId: coverImageFileId || null,
                    itemAddPolicy,
                    items: draftItems.map((item) => ({
                      title: item.title.trim(),
                      summary: item.summary.trim() ? item.summary.trim() : null,
                      imageFileId: item.imageFileId.trim() ? item.imageFileId.trim() : null,
                      brandName: item.brandName.trim() ? item.brandName.trim() : null,
                      linkedModelSlug: item.linkedModelSlug
                    }))
                  } as Parameters<typeof apiClient.createRanking>[0];

                  const request = editId
                    ? apiClient.updateRanking(editId, payload)
                    : apiClient.createRanking(payload);

                  void request
                    .then((response) => {
                      if (editId) {
                        void navigate(APP_ROUTES.rankingDetail.replace(":id", response.item.id));
                        return;
                      }

                      void navigate(buildPublishStatusPath("ranking", response.item.id), {
                        state: {
                          title,
                          description,
                          imageUrl: coverImageUrl || null
                        }
                      });
                    })
                    .catch((reason: unknown) => {
                      setSubmitError(reason instanceof Error ? reason.message : "榜单提交失败");
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }}
                type="button"
                variant="hero"
              >
                {isSubmitting ? "提交中..." : editId ? "保存榜单" : "发布榜单"}
              </Button>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      aside={
        <>
          <SitePanel variant="muted">
            <SitePanelBody className="space-y-4">
              <div className="text-sm uppercase tracking-[0.18em] text-muted-foreground">预览</div>
              {coverImageUrl ? (
                <div className="overflow-hidden rounded-[0.95rem] border border-border/70">
                  <img
                    alt="preview cover"
                    className="h-[220px] w-full object-cover"
                    src={coverImageUrl}
                  />
                </div>
              ) : (
                <div className="flex h-[220px] w-full items-center justify-center rounded-[0.95rem] border border-dashed border-border/70 bg-surface-1 text-sm text-muted-foreground">
                  暂未设置封面
                </div>
              )}
              <div className="space-y-2">
                <div className="text-[1.25rem] font-semibold text-foreground">{title || "榜单标题"}</div>
                <div className="text-sm leading-6 text-muted-foreground">{description || "榜单简介"}</div>
              </div>
              <div className="space-y-3">
                {draftItems.slice(0, 5).map((item, index) => (
                  <div className="border-b border-border/60 pb-3 last:border-b-0" key={item.id}>
                    <div className="text-sm font-medium text-foreground">
                      #{index + 1} {item.title || "未命名条目"}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.brandName || "待补充品牌"}</div>
                  </div>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>
        </>
      }
      title={editId ? (addMode ? "新增排行对象" : "编辑榜单") : "创建榜单"}
    />
  );
}
