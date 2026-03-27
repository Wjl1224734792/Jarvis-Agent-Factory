import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon, CameraIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../../lib/api-client";

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
  const params = useParams<{ id: string }>();
  const editId = params.id ?? "";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["admin-ranking-detail", editId],
    queryFn: () => apiClient.getRankingDetail(editId),
    enabled: Boolean(editId)
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-ranking-models"],
    queryFn: () => apiClient.listModels()
  });

  useEffect(() => {
    if (!detailQuery.data?.item) {
      return;
    }

    const ranking = detailQuery.data.item;
    setTitle(ranking.title);
    setDescription(ranking.description);
    setCoverImageUrl(ranking.coverImageUrl ?? "");
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

  function appendModel(slug: string, name: string, brandName: string) {
    setDraftItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        title: name,
        summary: "",
        imageUrl: "",
        brandName,
        linkedModelSlug: slug
      }
    ]);
  }

  function updateItem(id: string, patch: Partial<DraftItem>) {
    setDraftItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  const isFormValid =
    title.trim().length >= 2 &&
    description.trim().length > 0 &&
    draftItems.length > 0 &&
    draftItems.every((item) => item.title.trim().length > 0);

  const fieldClassName =
    "w-full rounded-[18px] border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
          to={APP_ROUTES.adminRankings}
        >
          <ArrowLeftIcon className="mr-2 h-4 w-4" />
          返回
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Official Ranking</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{editId ? "编辑官方榜单" : "新建官方榜单"}</h2>
        </div>
      </div>

      {submitError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
          {submitError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-lg font-semibold text-white">基本信息</div>
            <input
              className={fieldClassName}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="榜单标题"
              value={title}
            />
            <textarea
              className={`${fieldClassName} min-h-32`}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="榜单简介"
              value={description}
            />
          </section>

          <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-white">封面</div>
              <button
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                onClick={() => setCoverImageUrl(`official-cover-${Date.now()}`)}
                type="button"
              >
                <CameraIcon className="mr-2 h-4 w-4" />
                更新封面键
              </button>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-slate-900/60 px-4 py-16 text-center text-sm text-slate-400">
              {coverImageUrl || "使用模型图或后续接入上传"}
            </div>
          </section>

          <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-white">榜单条目</div>
              <button
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white"
                onClick={() => setDraftItems((items) => [...items, emptyDraftItem()])}
                type="button"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                自定义条目
              </button>
            </div>
            <div className="space-y-4">
              {draftItems.map((item, index) => (
                <div className="rounded-[22px] border border-white/10 bg-slate-950/30 p-4" key={item.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">#{index + 1}</div>
                    <button
                      className="inline-flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white"
                      onClick={() => setDraftItems((items) => items.filter((entry) => entry.id !== item.id))}
                      type="button"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 space-y-3">
                    <input
                      className={fieldClassName}
                      onChange={(event) => updateItem(item.id, { title: event.target.value })}
                      placeholder="标题"
                      value={item.title}
                    />
                    <input
                      className={fieldClassName}
                      onChange={(event) => updateItem(item.id, { brandName: event.target.value })}
                      placeholder="品牌"
                      value={item.brandName}
                    />
                    <textarea
                      className={`${fieldClassName} min-h-24`}
                      onChange={(event) => updateItem(item.id, { summary: event.target.value })}
                      placeholder="摘要"
                      value={item.summary}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-lg font-semibold text-white">从机型库添加</div>
            <div className="grid gap-3 md:grid-cols-2">
              {suggestedModels.map((model) => (
                <button
                  className="rounded-[22px] border border-white/10 bg-slate-950/30 px-4 py-4 text-left transition hover:border-cyan-300/25 hover:bg-white/6"
                  key={model.id}
                  onClick={() => appendModel(model.slug, model.name, model.brand.name)}
                  type="button"
                >
                  <div className="text-sm font-medium text-white">{model.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">{model.brand.name}</div>
                </button>
              ))}
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <button
              className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm text-white transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isFormValid || isSubmitting}
              onClick={() => {
                setSubmitError(null);
                setIsSubmitting(true);
                const payload = {
                  type: "official",
                  title,
                  description,
                  coverImageUrl: coverImageUrl || null,
                  itemAddPolicy: "owner",
                  items: draftItems.map((item) => ({
                    title: item.title.trim(),
                    summary: item.summary.trim() ? item.summary.trim() : null,
                    imageUrl: item.imageUrl.trim() ? item.imageUrl.trim() : null,
                    brandName: item.brandName.trim() ? item.brandName.trim() : null,
                    linkedModelSlug: item.linkedModelSlug
                  }))
                } as Parameters<typeof apiClient.createRanking>[0];

                const request = editId
                  ? apiClient.updateRanking(editId, payload as Parameters<typeof apiClient.updateRanking>[1])
                  : apiClient.createRanking(payload);

                void request
                  .then((response) => {
                    navigate(`${APP_ROUTES.adminRankings}/${response.item.id}`, { replace: true });
                  })
                  .catch((reason: unknown) => {
                    setSubmitError(reason instanceof Error ? reason.message : "榜单保存失败");
                  })
                  .finally(() => {
                    setIsSubmitting(false);
                  });
              }}
              type="button"
            >
              {isSubmitting ? "保存中..." : "保存官方榜单"}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Preview</div>
            <div className="mt-3 text-2xl font-semibold text-white">{title || "官方榜单标题"}</div>
            <div className="mt-2 text-sm leading-7 text-slate-300">{description || "榜单简介"}</div>
            <div className="mt-4 space-y-3">
              {draftItems.map((item, index) => (
                <div className="border-b border-white/8 pb-3 last:border-b-0" key={item.id}>
                  <div className="text-sm font-medium text-white">
                    #{index + 1} {item.title || "未命名条目"}
                  </div>
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.brandName || "待补充品牌"}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
