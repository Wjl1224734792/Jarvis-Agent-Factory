import { useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, Input, List, Space, Tag } from "antd";
import { startTransition, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type AdminSearchItem = Awaited<ReturnType<typeof apiClient.searchAdmin>>["items"][number];

const SECTION_ORDER = ["moderation", "operations", "management"] as const;

const SECTION_LABEL: Record<(typeof SECTION_ORDER)[number], string> = {
  moderation: "审核对象",
  operations: "运营对象",
  management: "管理对象"
};

const TYPE_LABEL: Record<string, string> = {
  post_article: "文章",
  post_moment: "动态",
  post_comment: "帖子评论",
  model_comment: "机型评论",
  review: "评测",
  review_comment: "评测评论",
  ranking_comment: "榜单评论",
  rating_target_comment: "排行对象评论",
  brand_application: "品牌申请",
  aircraft_submission: "机型投稿",
  ranking: "榜单",
  rating_target: "评分对象",
  report: "举报",
  official_article: "官方文章",
  model: "机型",
  brand: "品牌",
  category: "机型分类",
  content_category: "内容分类"
};

export function AdminSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("q")?.trim() ?? "";
  const [draftQuery, setDraftQuery] = useState(searchQuery);

  useEffect(() => {
    setDraftQuery(searchQuery);
  }, [searchQuery]);

  const searchResultQuery = useQuery({
    queryKey: ["admin-search", searchQuery],
    queryFn: () =>
      apiClient.searchAdmin({
        q: searchQuery,
        limit: 24
      }),
    enabled: searchQuery.length >= 2
  });

  const groupedItems = useMemo(() => {
    const groups = new Map<(typeof SECTION_ORDER)[number], AdminSearchItem[]>();
    for (const section of SECTION_ORDER) {
      groups.set(section, []);
    }

    for (const item of searchResultQuery.data?.items ?? []) {
      const bucket = groups.get(item.section);
      if (bucket) {
        bucket.push(item);
      }
    }

    return groups;
  }, [searchResultQuery.data?.items]);

  function submitSearch(value = draftQuery) {
    const trimmed = value.trim();
    startTransition(() => {
      setSearchParams(trimmed.length > 0 ? { q: trimmed } : {});
    });
  }

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Input.Search
            allowClear
            onChange={(event) => {
              setDraftQuery(event.target.value);
            }}
            onSearch={submitSearch}
            placeholder="搜索审核对象、运营内容或管理配置"
            style={{ width: 360 }}
            value={draftQuery}
          />
        </Space>
      }
      description="后台全局搜索按审核、运营、管理三组展示，并提供直接跳转目标。"
      title="全局搜索"
    >
      {searchQuery.length < 2 ? (
        <AdminPanel title="搜索提示">
          <Empty description="请输入至少 2 个字符后开始搜索" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </AdminPanel>
      ) : null}

      {searchQuery.length >= 2 && searchResultQuery.isLoading ? (
        <Card loading title="正在搜索" />
      ) : null}

      {searchQuery.length >= 2 && searchResultQuery.isError ? (
        <div className="admin-login__error">{searchResultQuery.error.message}</div>
      ) : null}

      {searchQuery.length >= 2 &&
      searchResultQuery.data &&
      !searchResultQuery.isLoading &&
      searchResultQuery.data.total === 0 ? (
        <AdminPanel title="没有匹配结果">
          <Empty description={`没有找到与“${searchQuery}”相关的后台对象`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </AdminPanel>
      ) : null}

      {searchQuery.length >= 2 && searchResultQuery.data
        ? SECTION_ORDER.map((section) => {
            const items = groupedItems.get(section) ?? [];
            if (items.length === 0) {
              return null;
            }

            return (
              <AdminPanel
                description={`命中 ${items.length} 条`}
                key={section}
                title={SECTION_LABEL[section]}
              >
                <List
                  dataSource={items}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Button key="open" type="link">
                          <Link to={item.targetPath}>打开</Link>
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        description={
                          <Space direction="vertical" size={4}>
                            <span>{item.subtitle ?? "暂无所属信息"}</span>
                            <span>
                              匹配字段：{item.matchedField}
                              {item.updatedAt
                                ? ` · 更新于 ${new Date(item.updatedAt).toLocaleString("zh-CN", {
                                    hour12: false
                                  })}`
                                : ""}
                            </span>
                          </Space>
                        }
                        title={
                          <Space wrap>
                            <Link to={item.targetPath}>{item.title}</Link>
                            <Tag color="blue">{TYPE_LABEL[item.type] ?? item.type}</Tag>
                            {item.statusLabel ? <Tag>{item.statusLabel}</Tag> : null}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </AdminPanel>
            );
          })
        : null}
    </AdminPage>
  );
}
