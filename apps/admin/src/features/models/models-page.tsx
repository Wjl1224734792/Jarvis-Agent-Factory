import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";

export function ModelsPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiClient.listBrands()
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-models"],
    queryFn: () => apiClient.listModels()
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    categoryId: "",
    brandId: "",
    powerType: "electric",
    summary: "",
    description: ""
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Models</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">机型管理</h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <form
          className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            void apiClient
              .createModel({
                slug: form.slug,
                name: form.name,
                categoryId: form.categoryId,
                brandId: form.brandId,
                powerType: form.powerType as "electric" | "fuel" | "hybrid",
                summary: form.summary || null,
                description: form.description || null,
                maxFlightTimeMinutes: null,
                maxRangeKilometers: null,
                maxSpeedKph: null,
                takeoffWeightGrams: null,
                isPublished: true
              })
              .then(() => {
                modelsQuery.refetch();
                setForm({
                  name: "",
                  slug: "",
                  categoryId: "",
                  brandId: "",
                  powerType: "electric",
                  summary: "",
                  description: ""
                });
              })
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "创建机型失败");
              });
          }}
        >
          <div className="space-y-4">
            {[
              ["name", "机型名称"],
              ["slug", "slug"],
              ["summary", "摘要"],
              ["description", "详情描述"]
            ].map(([field, label]) => (
              <input
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
                key={field}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    [field]: event.target.value
                  }));
                }}
                placeholder={label}
                value={form[field as keyof typeof form] as string}
              />
            ))}

            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  categoryId: event.target.value
                }));
              }}
              value={form.categoryId}
            >
              <option value="">选择分类</option>
              {(categoriesQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  brandId: event.target.value
                }));
              }}
              value={form.brandId}
            >
              <option value="">选择品牌</option>
              {(brandsQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  powerType: event.target.value
                }));
              }}
              value={form.powerType}
            >
              <option value="electric">电动</option>
              <option value="fuel">燃油</option>
              <option value="hybrid">混动</option>
            </select>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white"
              type="submit"
            >
              新增机型
            </button>
          </div>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/50 p-6">
          <div className="space-y-3">
            {modelsQuery.data?.items.map((item) => (
              <article
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                key={item.id}
              >
                <div className="font-medium text-white">{item.name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {item.brand.name} · {item.category.name} · {item.powerType}
                </div>
              </article>
            )) ?? null}
            {modelsQuery.isLoading ? <p className="text-sm text-slate-400">加载中…</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
