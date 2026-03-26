import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { CameraIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { SitePage } from "@/components/site-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

type DraftItem = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  brandName: string;
  linkedModelSlug: string | null;
};

function emptyDraftItem(): DraftItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    summary: "",
    imageUrl: "",
    brandName: "",
    linkedModelSlug: null
  };
}

export function RankingEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const addMode = searchParams.get("add") === "1";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [itemAddPolicy, setItemAddPolicy] = useState<"public" | "owner">("owner");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modelsQuery = useQuery({
    queryKey: ["ranking-editor-models"],
    queryFn: () => apiClient.listModels()
  });
  const detailQuery = useQuery({
    queryKey: ["ranking-detail", editId],
    queryFn: () => apiClient.getRankingDetail(editId!),
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const ranking = detailQuery.data.item;
    setTitle(ranking.title);
    setDescription(ranking.description);
    setCoverImageUrl(ranking.coverImageUrl ?? "");
    setItemAddPolicy(ranking.itemAddPolicy);
    setDraftItems(
      ranking.items.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary ?? "",
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
    modelsQuery.data?.items.filter((model) => !selectedModelSlugs.has(model.slug)).slice(0, 8) ?? [];

  function appendModel(slug: string, name: string, brandName: string, imageUrl: string) {
    setDraftItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        title: name,
        summary: "",
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

  function removeItem(id: string) {
    setDraftItems((items) => items.filter((item) => item.id !== id));
  }

  const isFormValid =
    title.trim().length >= 2 &&
    description.trim().length > 0 &&
    draftItems.length > 0 &&
    draftItems.every((item) => item.title.trim().length > 0);

  return (
    <SitePage className="mx-auto w-full max-w-[1080px] gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-primary">{editId ? (addMode ? "新增排行对象" : "编辑榜单") : "创建榜单"}</div>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-foreground">
            {editId ? "维护榜单内容" : "创建新的榜单"}
          </h1>
        </div>
        <Button asChild variant="ghost">
          <Link to={APP_ROUTES.rankings}>返回榜单</Link>
        </Button>
      </div>

      {detailQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>榜单数据加载失败</AlertTitle>
          <AlertDescription>{detailQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section className="space-y-4 border border-border/60 p-4">
            <div className="text-lg font-semibold text-foreground">基础信息</div>
            <Input onChange={(event) => setTitle(event.target.value)} placeholder="榜单标题" value={title} />
            <Textarea
              className="min-h-32"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="榜单简介"
              value={description}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground/72">谁可新增排行对象</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "public", label: "访问用户可新增" },
                  { value: "owner", label: "只有自己可新增" }
                ].map((item) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
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
          </section>

          <section className="space-y-4 border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-foreground">封面图</div>
              <Button
                onClick={() => setCoverImageUrl(getEditorialImage(`ranking-cover-${Date.now()}`))}
                size="sm"
                type="button"
                variant="outline"
              >
                <CameraIcon data-icon="inline-start" />
                换一张
              </Button>
            </div>
            <div className="overflow-hidden rounded-[0.95rem]">
              <img
                alt="ranking cover"
                className="h-[240px] w-full object-cover"
                src={coverImageUrl || getEditorialImage("ranking-editor")}
              />
            </div>
          </section>

          <section className="space-y-4 border border-border/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-foreground">排行对象</div>
              <Button onClick={appendCustomItem} size="sm" type="button" variant="outline">
                <PlusIcon data-icon="inline-start" />
                新增自定义条目
              </Button>
            </div>

            <div className="space-y-4">
              {draftItems.map((item, index) => (
                <div className="space-y-3 border-b border-border/60 pb-4 last:border-b-0" key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">#{index + 1}</div>
                    <Button onClick={() => removeItem(item.id)} size="sm" type="button" variant="ghost">
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                  <Input
                    onChange={(event) => updateItem(item.id, { title: event.target.value })}
                    placeholder="标题"
                    value={item.title}
                  />
                  <Input
                    onChange={(event) => updateItem(item.id, { brandName: event.target.value })}
                    placeholder="品牌 / 标签"
                    value={item.brandName}
                  />
                  <Textarea
                    className="min-h-24"
                    onChange={(event) => updateItem(item.id, { summary: event.target.value })}
                    placeholder="摘要"
                    value={item.summary}
                  />
                  <Input
                    onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })}
                    placeholder="图片地址（可留空）"
                    value={item.imageUrl}
                  />
                </div>
              ))}
            </div>

            {draftItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">先从下方飞行器库中选择，或新增一个自定义条目。</div>
            ) : null}
          </section>

          <section className="space-y-4 border border-border/60 p-4">
            <div className="text-lg font-semibold text-foreground">从飞行器库添加</div>
            <div className="grid gap-3 md:grid-cols-2">
              {suggestedModels.map((model, index) => (
                <button
                  className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 border border-border/60 p-3 text-left transition hover:border-primary/30 hover:bg-primary/3"
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
                    className="h-[88px] w-full rounded-[0.8rem] object-cover"
                    src={getModelImage(model.slug, model.powerType, index)}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{model.name}</div>
                    <div className="text-xs text-muted-foreground">{model.brand.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>榜单提交失败</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              disabled={!isFormValid || isSubmitting}
              onClick={() => {
                setSubmitError(null);
                setIsSubmitting(true);
                const payload = {
                  title,
                  description,
                  coverImageUrl: coverImageUrl || null,
                  itemAddPolicy,
                  items: draftItems.map((item) => ({
                    title: item.title.trim(),
                    summary: item.summary.trim() ? item.summary.trim() : null,
                    imageUrl: item.imageUrl.trim() ? item.imageUrl.trim() : null,
                    brandName: item.brandName.trim() ? item.brandName.trim() : null,
                    linkedModelSlug: item.linkedModelSlug
                  }))
                };

                const request = editId
                  ? apiClient.updateRanking(editId, payload)
                  : apiClient.createRanking(payload);

                void request
                  .then((response) => {
                    navigate(APP_ROUTES.rankingDetail.replace(":id", response.item.id));
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
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-lg font-semibold text-foreground">实时预览</div>
          <div className="overflow-hidden rounded-[0.95rem] border border-border/60">
            <img
              alt="preview cover"
              className="h-[220px] w-full object-cover"
              src={coverImageUrl || getEditorialImage("ranking-preview")}
            />
          </div>
          <div className="space-y-2">
            <div className="text-[1.4rem] font-semibold text-foreground">{title || "榜单标题"}</div>
            <div className="text-sm leading-7 text-muted-foreground">
              {description || "榜单简介会显示在这里。"}
            </div>
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
        </div>
      </div>
    </SitePage>
  );
}
