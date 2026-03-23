import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../lib/api-client";

export function BrandsPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => apiClient.listCategories()
  });
  const brandsQuery = useQuery({
    queryKey: ["admin-brands"],
    queryFn: () => apiClient.listBrands()
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Brands</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">品牌管理</h2>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="rounded-[28px] border border-white/10 bg-slate-900/70 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            void apiClient
              .createBrand({
                slug,
                name,
                categoryId: categoryId || null,
                sortOrder: 0,
                isEnabled: true
              })
              .then(() => {
                brandsQuery.refetch();
                setName("");
                setSlug("");
                setCategoryId("");
              })
              .catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "创建品牌失败");
              });
          }}
        >
          <div className="space-y-4">
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="品牌名称"
              value={name}
            />
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => {
                setSlug(event.target.value);
              }}
              placeholder="slug"
              value={slug}
            />
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              onChange={(event) => {
                setCategoryId(event.target.value);
              }}
              value={categoryId}
            >
              <option value="">未关联分类</option>
              {(categoriesQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-medium text-white"
              type="submit"
            >
              新增品牌
            </button>
          </div>
        </form>

        <div className="rounded-[28px] border border-white/10 bg-slate-950/50 p-6">
          <div className="space-y-3">
            {(brandsQuery.data ?? []).map((item) => (
              <article
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                key={item.id}
              >
                <div className="font-medium text-white">{item.name}</div>
                <div className="mt-1 text-xs text-slate-400">{item.slug}</div>
              </article>
            ))}
            {brandsQuery.isLoading ? <p className="text-sm text-slate-400">加载中…</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
