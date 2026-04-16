import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Virtuoso } from "react-virtuoso";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SearchItem = Awaited<ReturnType<typeof apiClient.searchSite>>["items"][number];

const SEARCH_TYPE_ORDER = [
  "post_article",
  "post_moment",
  "model",
  "ranking",
  "rating_target",
  "user"
] as const;

const SEARCH_TYPE_LABEL: Record<(typeof SEARCH_TYPE_ORDER)[number], string> = {
  post_article: "文章",
  post_moment: "动态",
  model: "机型",
  ranking: "榜单",
  rating_target: "排行对象",
  user: "用户"
};

type SearchType = (typeof SEARCH_TYPE_ORDER)[number];

function isSearchType(value: string): value is SearchType {
  return (SEARCH_TYPE_ORDER as readonly string[]).includes(value);
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

/** 摘要若与标题重复或仅为标题续接，则不单独展示 */
function getDisplaySummary(title: string, summary: string | null): string | null {
  if (!summary?.trim()) {
    return null;
  }

  const t = title.trim();
  const s = summary.trim();
  if (s === t) {
    return null;
  }

  if (s.startsWith(t)) {
    const rest = s
      .slice(t.length)
      .trim()
      .replace(/^[，。；：、\s]+/u, "");
    if (rest.length === 0) {
      return null;
    }
  }

  return s;
}

function SearchResultRow({
  item,
  index,
  total
}: {
  item: SearchItem;
  index: number;
  total: number;
}) {
  const updatedAt = formatUpdatedAt(item.updatedAt);
  const summaryText = getDisplaySummary(item.title, item.summary);

  return (
    <div className={cn(index < total - 1 && "border-b border-border/70")}>
      <Link className="block px-4 py-3.5 transition-colors hover:bg-sky-50/45" to={item.href}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] text-muted-foreground">
          {updatedAt ? <span>更新于 {updatedAt}</span> : null}
        </div>
        <div className="mt-1 text-base font-semibold tracking-tight text-foreground">{item.title}</div>
        {item.subtitle ? (
          <div className="mt-0.5 text-sm text-muted-foreground">{item.subtitle}</div>
        ) : null}
        {summaryText ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{summaryText}</p>
        ) : null}
      </Link>
    </div>
  );
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() ?? "";

  const searchResultQuery = useQuery({
    queryKey: ["site-search", searchQuery],
    queryFn: () =>
      apiClient.searchSite({
        q: searchQuery,
        limit: 24
      }),
    enabled: searchQuery.length >= 1
  });

  const groupedItems = useMemo(() => {
    const groups = new Map<SearchType, SearchItem[]>();
    for (const type of SEARCH_TYPE_ORDER) {
      groups.set(type, []);
    }

    for (const item of searchResultQuery.data?.items ?? []) {
      const bucket = groups.get(item.type);
      if (bucket) {
        bucket.push(item);
      }
    }

    return groups;
  }, [searchResultQuery.data?.items]);

  const typesWithResults = useMemo(
    () => SEARCH_TYPE_ORDER.filter((t) => (groupedItems.get(t) ?? []).length > 0),
    [groupedItems]
  );

  const typeFromUrl = searchParams.get("type");
  const activeType: SearchType | null = useMemo(() => {
    if (typesWithResults.length === 0) {
      return null;
    }
    if (typeFromUrl && isSearchType(typeFromUrl) && typesWithResults.includes(typeFromUrl)) {
      return typeFromUrl;
    }
    return typesWithResults[0] ?? null;
  }, [typesWithResults, typeFromUrl]);

  useEffect(() => {
    if (searchQuery.length < 1 || !searchResultQuery.data || typesWithResults.length === 0) {
      return;
    }

    const requested = searchParams.get("type");
    const valid =
      requested && isSearchType(requested) && typesWithResults.includes(requested);

    if (valid) {
      return;
    }

    const fallbackType = typesWithResults[0];
    if (fallbackType === undefined) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set("q", searchQuery);
    next.set("type", fallbackType);
    setSearchParams(next, { replace: true });
  }, [
    searchQuery,
    searchResultQuery.data,
    typesWithResults,
    searchParams,
    setSearchParams
  ]);

  const activeItems = activeType ? (groupedItems.get(activeType) ?? []) : [];

  function selectSearchType(type: SearchType) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("q", searchQuery);
        p.set("type", type);
        return p;
      },
      { replace: false }
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {searchQuery.length < 1 ? (
        <section className="rounded-none border border-dashed border-border/70 bg-background/70 p-8 text-center text-sm text-muted-foreground">
          请使用顶部搜索栏输入关键词开始搜索。
        </section>
      ) : (
        <section className="rounded-none border border-border/70 bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          当前关键词 <span className="font-medium text-foreground">{searchQuery}</span>
          {searchResultQuery.data ? (
            <span className="ml-2">共 {searchResultQuery.data.total} 条结果</span>
          ) : null}
        </section>
      )}

      {searchQuery.length >= 1 && searchResultQuery.isLoading ? (
        <section className="rounded-none border border-border/70 bg-card/70 p-8 text-sm text-muted-foreground">
          正在整理搜索结果...
        </section>
      ) : null}

      {searchQuery.length >= 1 && searchResultQuery.isError ? (
        <section className="rounded-none border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {searchResultQuery.error.message}
        </section>
      ) : null}

      {searchQuery.length >= 1 &&
      !searchResultQuery.isLoading &&
      !searchResultQuery.isError &&
      searchResultQuery.data &&
      searchResultQuery.data.total === 0 ? (
        <section className="rounded-none border border-border/70 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          没有找到与“{searchQuery}”相关的公开内容。
        </section>
      ) : null}

      {searchQuery.length >= 1 &&
      !searchResultQuery.isLoading &&
      !searchResultQuery.isError &&
      searchResultQuery.data &&
      searchResultQuery.data.total > 0 &&
      activeType ? (
        <>
          {typesWithResults.length > 1 ? (
            <div className="border-b border-border/60 px-1">
              <div className="flex gap-5 overflow-x-auto whitespace-nowrap">
                {typesWithResults.map((type) => {
                  const count = groupedItems.get(type)?.length ?? 0;
                  const isActive = type === activeType;

                  return (
                    <button
                      className={cn(
                        "site-tab-trigger relative border-b-2 border-transparent px-0 py-2.5 text-[0.9rem] text-foreground/70 transition-colors",
                        isActive && "border-primary font-semibold text-primary"
                      )}
                      key={type}
                      onClick={() => {
                        selectSearchType(type);
                      }}
                      type="button"
                    >
                      {SEARCH_TYPE_LABEL[type]}
                      <span className="ml-1 text-[0.85rem] opacity-80">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <section className="overflow-hidden rounded-none bg-white">
            {activeItems.length > 0 ? (
              <Virtuoso
                className="virtual-feed"
                computeItemKey={(_, item) => `${item.type}-${item.id}`}
                data={activeItems}
                increaseViewportBy={{ top: 240, bottom: 360 }}
                itemContent={(index, item) => (
                  <SearchResultRow index={index} item={item} total={activeItems.length} />
                )}
                useWindowScroll
              />
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
