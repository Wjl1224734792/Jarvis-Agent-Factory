import { useQuery } from "@tanstack/react-query";
import { Empty, Input, Segmented, Select, Space, Table, Tag, Button } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "可见", value: "visible" },
  { label: "已隐藏", value: "hidden" }
] as const;

const domainOptions = [
  { label: "帖子评论", value: "post" },
  { label: "评测评论", value: "review" },
  { label: "机型评论", value: "model" },
  { label: "榜单评论", value: "ranking" },
  { label: "评分对象评论", value: "rating-target" }
] as const;
const domainSegmentedOptions: Array<{ label: string; value: string }> = domainOptions.map((item) => ({
  label: item.label,
  value: item.value
}));

type CommentStatusFilter = (typeof statusOptions)[number]["value"];
type CommentDomain = (typeof domainOptions)[number]["value"];

type UnifiedRecord = {
  key: string;
  domain: CommentDomain;
  title: string;
  subtitle: string;
  content: string;
  status: "pending" | "visible" | "hidden";
  reportCount: number;
  onToggle: () => Promise<unknown>;
};

function statusLabel(status: UnifiedRecord["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "visible":
      return { color: "green", text: "可见" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

export function PostCommentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlDomain = searchParams.get("domain");
  const [status, setStatus] = useState<CommentStatusFilter>(
    urlStatus === "pending" || urlStatus === "visible" || urlStatus === "hidden" ? urlStatus : "all"
  );
  const [domain, setDomain] = useState<CommentDomain>(
    urlDomain === "review" ||
      urlDomain === "model" ||
      urlDomain === "ranking" ||
      urlDomain === "rating-target"
      ? urlDomain
      : "post"
  );
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setStatus(
      urlStatus === "pending" || urlStatus === "visible" || urlStatus === "hidden" ? urlStatus : "all"
    );
  }, [urlStatus]);

  useEffect(() => {
    setDomain(
      urlDomain === "review" ||
        urlDomain === "model" ||
        urlDomain === "ranking" ||
        urlDomain === "rating-target"
        ? urlDomain
        : "post"
    );
  }, [urlDomain]);

  const siteSettingsQuery = useQuery({
    queryKey: ["admin-comment-site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const postCommentsQuery = useQuery({
    queryKey: ["admin-post-comments-all"],
    queryFn: () => apiClient.listAdminPostComments()
  });
  const reviewCommentsQuery = useQuery({
    queryKey: ["admin-review-comments-all"],
    queryFn: () => apiClient.listAdminReviewComments()
  });
  const modelCommentsQuery = useQuery({
    queryKey: ["admin-model-comments-all"],
    queryFn: () => apiClient.listAdminModelComments()
  });
  const rankingCommentsQuery = useQuery({
    queryKey: ["admin-ranking-comments-all"],
    queryFn: () => apiClient.listAdminRankingComments()
  });
  const ratingTargetCommentsQuery = useQuery({
    queryKey: ["admin-rating-target-comments-all"],
    queryFn: () => apiClient.listAdminRatingTargetComments()
  });

  async function refreshAll() {
    await Promise.all([
      postCommentsQuery.refetch(),
      reviewCommentsQuery.refetch(),
      modelCommentsQuery.refetch(),
      rankingCommentsQuery.refetch(),
      ratingTargetCommentsQuery.refetch()
    ]);
  }

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      if (!current) {
        return;
      }
      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(current, {
          commentModerationEnabled: enabled
        })
      );
      await Promise.all([siteSettingsQuery.refetch(), refreshAll()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新评论审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const records = useMemo<Record<CommentDomain, UnifiedRecord[]>>(
    () => ({
      post: (postCommentsQuery.data?.items ?? []).map((item) => ({
        key: `post-${item.id}`,
        domain: "post",
        title: item.postTitle,
        subtitle: `${item.author.displayName} · ${item.parentCommentId ? "回复" : "主评论"}`,
        content: item.content,
        status: item.status,
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminPostCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      review: (reviewCommentsQuery.data?.items ?? []).map((item) => ({
        key: `review-${item.id}`,
        domain: "review",
        title: item.reviewTitle,
        subtitle: `${item.author.displayName} · ${item.model.name}`,
        content: item.content,
        status: item.status,
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminReviewCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      model: (modelCommentsQuery.data?.items ?? []).map((item) => ({
        key: `model-${item.id}`,
        domain: "model",
        title: item.model.name,
        subtitle: `${item.author.displayName} · ${item.parentCommentId ? "回复" : "主评论"}`,
        content: item.content,
        status: item.status,
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminModelCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      ranking: (rankingCommentsQuery.data?.items ?? []).map((item) => ({
        key: `ranking-${item.id}`,
        domain: "ranking",
        title: item.rankingTitle,
        subtitle: `${item.author.displayName} · 榜单评论`,
        content: item.content,
        status: item.status,
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminRankingCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      "rating-target": (ratingTargetCommentsQuery.data?.items ?? []).map((item) => ({
        key: `rating-target-${item.id}`,
        domain: "rating-target",
        title: `${item.rankingTitle} / ${item.ratingTargetTitle}`,
        subtitle: `${item.author.displayName} · ${item.parentCommentId ? "回复" : "主评论"}`,
        content: item.content,
        status: item.status,
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminRatingTargetCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      }))
    }),
    [
      modelCommentsQuery.data?.items,
      postCommentsQuery.data?.items,
      rankingCommentsQuery.data?.items,
      ratingTargetCommentsQuery.data?.items,
      reviewCommentsQuery.data?.items
    ]
  );

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return records[domain]
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) =>
        !keyword
          ? true
          : [item.title, item.subtitle, item.content].some((value) =>
              String(value).toLowerCase().includes(keyword)
            )
      );
  }, [domain, records, searchText, status]);

  const pendingCount = Object.values(records)
    .flat()
    .filter((item) => item.status === "pending").length;

  return (
    <AdminPage
      actions={
        <Space wrap>
          <Input.Search
            allowClear
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder="搜索来源、作者或评论内容"
            style={{ width: 280 }}
            value={searchText}
          />
          <Segmented
            onChange={(value) => {
              setDomain(value as CommentDomain);
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                next.set("domain", String(value));
                return next;
              });
            }}
            options={domainSegmentedOptions}
            value={domain}
          />
          <Select
            onChange={(value) => {
              setStatus(value);
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (value === "all") {
                  next.delete("status");
                } else {
                  next.set("status", value);
                }
                return next;
              });
            }}
            options={statusOptions as unknown as Array<{ label: string; value: string }>}
            style={{ width: 180 }}
            value={status}
          />
        </Space>
      }
      description="把帖子评论、评测评论、机型评论、榜单评论、榜单条目评论收成统一审核入口。"
      title="评论审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="开启人工审核后，所有评论域的新评论都会先进入待审核队列。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新的评论会直接显示。"
          description="适合评论量大时快速放开展示；开启后统一进入评论审核。"
          enabled={siteSettingsQuery.data?.item.commentModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的评论会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={pendingCount}
          title="评论审核"
        />
      </AdminPanel>

      <AdminPanel title="评论列表">
        <Table
          bordered
          columns={[
            {
              key: "domain",
              render: (_, record: UnifiedRecord) => <Tag>{domainOptions.find((item) => item.value === record.domain)?.label}</Tag>,
              title: "域",
              width: 110
            },
            {
              key: "source",
              render: (_, record: UnifiedRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">{record.subtitle}</div>
                </div>
              ),
              title: "来源"
            },
            {
              dataIndex: "content",
              key: "content",
              title: "评论内容"
            },
            {
              key: "reports",
              render: (_, record: UnifiedRecord) =>
                record.reportCount > 0 ? <Tag color="red">举报 {record.reportCount}</Tag> : <span>-</span>,
              title: "举报",
              width: 110
            },
            {
              key: "status",
              render: (_, record: UnifiedRecord) => {
                const meta = statusLabel(record.status);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: UnifiedRecord) => (
                <Button
                  onClick={() => {
                    setError(null);
                    void record
                      .onToggle()
                      .then(() => refreshAll())
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : "更新评论状态失败");
                      });
                  }}
                  size="small"
                  type={record.status === "visible" ? "default" : "primary"}
                >
                  {record.status === "visible" ? "隐藏评论" : record.status === "pending" ? "通过显示" : "恢复显示"}
                </Button>
              ),
              title: "操作",
              width: 140
            }
          ]}
          dataSource={filteredItems}
          locale={{ emptyText: <Empty description="当前筛选下没有评论" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={
            postCommentsQuery.isLoading ||
            reviewCommentsQuery.isLoading ||
            modelCommentsQuery.isLoading ||
            rankingCommentsQuery.isLoading ||
            ratingTargetCommentsQuery.isLoading
          }
          rowKey={(record) => record.key}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
