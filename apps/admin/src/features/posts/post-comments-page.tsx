import { useQuery } from "@tanstack/react-query";
import { Empty, Input, Segmented, Select, Space, Table, Tag, Button } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminAuditRecordsPanel } from "../../components/admin-audit-records-panel";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  buildAdminAuditTracePlan,
  syncLatestAdminAuditManualDecision
} from "../../lib/admin-audit-tracking";
import {
  buildModerationTraceItems,
  MODERATION_TRACE_PLACEHOLDER
} from "../../lib/moderation-tracking";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";
import {
  buildCommentAuditManualDecision,
  buildAdminCommentQueryKey,
  countPendingAdminComments,
  isAdminCommentTargetMatch,
  sortAdminCommentsWithTargetFirst,
  shouldEnableAdminCommentQuery,
  type AdminCommentStatus,
  type CommentDomain
} from "./post-comments-page-helpers";

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

type CommentStatusFilter = AdminCommentStatus;

type UnifiedRecord = {
  id: string;
  key: string;
  domain: CommentDomain;
  title: string;
  subtitle: string;
  content: string;
  status: "pending" | "visible" | "hidden";
  nextStatus: "visible" | "hidden";
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
  const urlTargetId = searchParams.get("targetId");
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
  const activeStatus = status === "all" ? undefined : status;
  const postCommentsQuery = useQuery({
    queryKey: buildAdminCommentQueryKey("post", status),
    queryFn: () => apiClient.listAdminPostComments(activeStatus),
    enabled: shouldEnableAdminCommentQuery(domain, "post")
  });
  const reviewCommentsQuery = useQuery({
    queryKey: buildAdminCommentQueryKey("review", status),
    queryFn: () => apiClient.listAdminReviewComments(activeStatus),
    enabled: shouldEnableAdminCommentQuery(domain, "review")
  });
  const modelCommentsQuery = useQuery({
    queryKey: buildAdminCommentQueryKey("model", status),
    queryFn: () => apiClient.listAdminModelComments(activeStatus),
    enabled: shouldEnableAdminCommentQuery(domain, "model")
  });
  const rankingCommentsQuery = useQuery({
    queryKey: buildAdminCommentQueryKey("ranking", status),
    queryFn: () => apiClient.listAdminRankingComments(activeStatus),
    enabled: shouldEnableAdminCommentQuery(domain, "ranking")
  });
  const ratingTargetCommentsQuery = useQuery({
    queryKey: buildAdminCommentQueryKey("rating-target", status),
    queryFn: () => apiClient.listAdminRatingTargetComments(activeStatus),
    enabled: shouldEnableAdminCommentQuery(domain, "rating-target")
  });

  const currentDomainQuery =
    domain === "post"
      ? postCommentsQuery
      : domain === "review"
        ? reviewCommentsQuery
        : domain === "model"
          ? modelCommentsQuery
        : domain === "ranking"
          ? rankingCommentsQuery
          : ratingTargetCommentsQuery;
  const auditTracePlan = useMemo(
    () =>
      buildAdminAuditTracePlan({
        domain: "comment",
        subjectLabel: "评论",
        domainLabel: "评论",
        exactEntityId: urlTargetId
      }),
    [urlTargetId]
  );
  const auditQuery = useQuery({
    queryKey: ["admin-comment-audits", auditTracePlan.query.entityId ?? "recent"],
    queryFn: () => apiClient.listAdminAuditRecords(auditTracePlan.query)
  });

  async function refreshCurrentDomain() {
    await currentDomainQuery.refetch();
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
      await Promise.all([siteSettingsQuery.refetch(), refreshCurrentDomain()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新评论审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const records = useMemo<Record<CommentDomain, UnifiedRecord[]>>(
    () => ({
      post: (postCommentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        key: `post-${item.id}`,
        domain: "post",
        title: item.postTitle,
        subtitle: `${item.author.displayName} · ${item.parentCommentId ? "回复" : "主评论"}`,
        content: item.content,
        status: item.status,
        nextStatus: item.status === "visible" ? "hidden" : "visible",
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminPostCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      review: (reviewCommentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        key: `review-${item.id}`,
        domain: "review",
        title: item.reviewTitle,
        subtitle: `${item.author.displayName} · ${item.model.name}`,
        content: item.content,
        status: item.status,
        nextStatus: item.status === "visible" ? "hidden" : "visible",
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminReviewCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      model: (modelCommentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        key: `model-${item.id}`,
        domain: "model",
        title: item.model.name,
        subtitle: `${item.author.displayName} · ${item.parentCommentId ? "回复" : "主评论"}`,
        content: item.content,
        status: item.status,
        nextStatus: item.status === "visible" ? "hidden" : "visible",
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminModelCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      ranking: (rankingCommentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        key: `ranking-${item.id}`,
        domain: "ranking",
        title: item.rankingTitle,
        subtitle: `${item.author.displayName} · 榜单评论`,
        content: item.content,
        status: item.status,
        nextStatus: item.status === "visible" ? "hidden" : "visible",
        reportCount: item.reportCount ?? 0,
        onToggle: () => apiClient.updateAdminRankingCommentStatus(item.id, { status: item.status === "visible" ? "hidden" : "visible" })
      })),
      "rating-target": (ratingTargetCommentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        key: `rating-target-${item.id}`,
        domain: "rating-target",
        title: `${item.rankingTitle} / ${item.ratingTargetTitle}`,
        subtitle: `${item.author.displayName} · ${item.parentCommentId ? "回复" : "主评论"}`,
        content: item.content,
        status: item.status,
        nextStatus: item.status === "visible" ? "hidden" : "visible",
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
    const visibleItems = records[domain]
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) =>
        !keyword
          ? true
          : [item.title, item.subtitle, item.content].some((value) =>
              String(value).toLowerCase().includes(keyword)
            )
      );
    if (!urlTargetId) {
      return visibleItems;
    }

    return sortAdminCommentsWithTargetFirst(visibleItems, urlTargetId);
  }, [domain, records, searchText, status, urlTargetId]);

  const pendingCount = countPendingAdminComments(records[domain]);
  const traceItems = useMemo(
    () =>
      buildModerationTraceItems([
        {
          label: "待处理队列",
          count: records[domain].filter((item) => item.status === "pending").length,
          tone: "warning"
        },
        {
          label: "当前可见",
          count: records[domain].filter((item) => item.status === "visible").length,
          tone: "success",
          hideWhenZero: true
        },
        {
          label: "已隐藏",
          count: records[domain].filter((item) => item.status === "hidden").length,
          hideWhenZero: true
        }
      ]),
    [domain, records]
  );

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

      <AdminPanel
        description="开启表示新评论先走 AI 审核；关闭表示所有评论域直接进入人工审核队列。"
        title="当前模式"
      >
        <AdminModerationCard
          aiCopy="新评论会先进入 AI 审核；仍需人工处理的评论会继续留在统一审核队列。"
          description="当前页合并了多个评论域，先展示统一状态和待办数量。"
          enabled={siteSettingsQuery.data?.item.commentModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新评论会直接进入人工审核队列，不再按“自动显示”处理。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={pendingCount}
          traceHint={MODERATION_TRACE_PLACEHOLDER}
          traceItems={traceItems}
          title="评论审核"
        />
      </AdminPanel>

      <AdminAuditRecordsPanel
        description={auditTracePlan.panelDescription}
        emptyText={auditTracePlan.emptyText}
        hint={auditTracePlan.hint}
        loading={auditQuery.isFetching}
        records={auditQuery.data?.items}
      />

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
                    void (async () => {
                      try {
                        await record.onToggle();
                        await syncLatestAdminAuditManualDecision(
                          buildCommentAuditManualDecision(record.id, record.nextStatus)
                        );
                        await Promise.all([refreshCurrentDomain(), auditQuery.refetch()]);
                      } catch (reason: unknown) {
                        setError(reason instanceof Error ? reason.message : "更新评论状态失败");
                      }
                    })();
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
          loading={currentDomainQuery.isLoading || currentDomainQuery.isFetching}
          rowClassName={(record) =>
            isAdminCommentTargetMatch(record.id, urlTargetId) ? "admin-table-row--target" : ""
          }
          rowKey={(record) => record.key}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
