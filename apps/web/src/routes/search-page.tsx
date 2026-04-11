import { useQuery } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const [draftQuery, setDraftQuery] = useState(searchQuery);

  useEffect(() => {
    setDraftQuery(searchQuery);
  }, [searchQuery]);

  const searchResultQuery = useQuery({
    queryKey: ["site-search", searchQuery],
    queryFn: () =>
      apiClient.searchSite({
        q: searchQuery,
        limit: 24
      }),
    enabled: searchQuery.length >= 2
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

  function submitSearch() {
    const trimmed = draftQuery.trim();
    startTransition(() => {
      setSearchParams(trimmed.length > 0 ? { q: trimmed } : {});
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="rounded-[1.5rem] border border-border/70 bg-card/70 p-5 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              全文搜索
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              搜索文章、动态、机型、榜单和用户
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              第一版先提供独立结果页，按内容类型分区展示。
            </p>
          </div>

          <form
            className="flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="站内全文搜索"
                className="pl-9"
                onChange={(event) => {
                  setDraftQuery(event.target.value);
                }}
                placeholder="至少输入 2 个字符，例如 DJI、续航、榜单"
                value={draftQuery}
              />
            </div>
            <Button type="submit">搜索</Button>
          </form>

          {searchQuery.length >= 2 ? (
            <div className="text-sm text-muted-foreground">
              当前关键词: <span className="font-medium text-foreground">{searchQuery}</span>
              {searchResultQuery.data ? (
                <span className="ml-2">共 {searchResultQuery.data.total} 条结果</span>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              输入至少 2 个字符后再提交搜索。
            </div>
          )}
        </div>
      </section>

      {searchQuery.length < 2 ? (
        <section className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 p-8 text-center text-sm text-muted-foreground">
          还没有开始搜索。可以尝试输入机型名、文章标题、榜单标题或用户昵称。
        </section>
      ) : null}

      {searchQuery.length >= 2 && searchResultQuery.isLoading ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/70 p-8 text-sm text-muted-foreground">
          正在整理搜索结果...
        </section>
      ) : null}

      {searchQuery.length >= 2 && searchResultQuery.isError ? (
        <section className="rounded-[1.5rem] border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {searchResultQuery.error.message}
        </section>
      ) : null}

      {searchQuery.length >= 2 &&
      !searchResultQuery.isLoading &&
      !searchResultQuery.isError &&
      searchResultQuery.data &&
      searchResultQuery.data.total === 0 ? (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          没有找到与“{searchQuery}”相关的公开内容。
        </section>
      ) : null}

      {searchQuery.length >= 2 &&
      !searchResultQuery.isLoading &&
      !searchResultQuery.isError &&
      searchResultQuery.data
        ? SEARCH_TYPE_ORDER.map((type) => {
            const items = groupedItems.get(type) ?? [];
            if (items.length === 0) {
              return null;
            }

            return (
              <section
                className="rounded-[1.5rem] border border-border/70 bg-card/70 p-5 shadow-[var(--shadow-soft)]"
                key={type}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      {SEARCH_TYPE_LABEL[type]}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      命中 {items.length} 条
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {items.map((item) => {
                    const updatedAt = formatUpdatedAt(item.updatedAt);

                    return (
                      <Link
                        className={cn(
                          "rounded-[1.1rem] border border-border/60 bg-background/85 p-4 transition-colors",
                          "hover:border-primary/30 hover:bg-accent/35"
                        )}
                        key={`${item.type}-${item.id}`}
                        to={item.href}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-primary/8 px-2 py-1 font-medium text-primary">
                            {SEARCH_TYPE_LABEL[type]}
                          </span>
                          <span>匹配字段: {item.matchedField}</span>
                          {updatedAt ? <span>更新于 {updatedAt}</span> : null}
                        </div>
                        <div className="mt-3 text-base font-semibold tracking-tight text-foreground">
                          {item.title}
                        </div>
                        {item.subtitle ? (
                          <div className="mt-1 text-sm text-muted-foreground">{item.subtitle}</div>
                        ) : null}
                        {item.summary ? (
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })
        : null}
    </div>
  );
}
