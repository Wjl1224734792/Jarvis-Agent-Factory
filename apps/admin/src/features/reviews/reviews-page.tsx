import { useQuery } from "@tanstack/react-query";
import { Button, Input, Segmented, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  buildModerationTraceItems,
  MODERATION_TRACE_PLACEHOLDER
} from "../../lib/moderation-tracking";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type ReviewRecord = Awaited<ReturnType<typeof apiClient.listAdminReviews>>["items"][number];
type ReviewStatusFilter = "all" | "pending" | "visible" | "hidden";

const reviewStatusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "可见", value: "visible" },
  { label: "已隐藏", value: "hidden" }
] as const;

function reviewStatusLabel(status: ReviewRecord["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "visible":
      return { color: "green", text: "可见" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

export function ReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlTargetId = searchParams.get("targetId");
  const [status, setStatus] = useState<ReviewStatusFilter>(
    urlStatus === "pending" || urlStatus === "visible" || urlStatus === "hidden"
      ? urlStatus
      : "all"
  );
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    setStatus(
      urlStatus === "pending" || urlStatus === "visible" || urlStatus === "hidden"
        ? urlStatus
        : "all"
    );
  }, [urlStatus]);

  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => apiClient.listAdminReviews()
  });
  const focusReviewId = urlTargetId ?? reviewsQuery.data?.items?.[0]?.id ?? null;
  const auditQuery = useQuery({
    queryKey: ["admin-review-audits", focusReviewId],
    queryFn: () =>
      apiClient.listAdminAuditRecords({
        domain: "review",
        entityId: focusReviewId ?? undefined,
        limit: 10
      }),
    enabled: Boolean(focusReviewId)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-reviews", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const visibleItems = (reviewsQuery.data?.items ?? [])
      .filter((item) => (status === "all" ? true : item.status === status))
      .filter((item) =>
        !keyword
          ? true
          : [item.model.name, item.author.displayName, item.content ?? ""].some((value) =>
              String(value).toLowerCase().includes(keyword)
            )
      );

    if (!urlTargetId) {
      return visibleItems;
    }

    return [...visibleItems].sort((left, right) => {
      if (left.id === urlTargetId) {
        return -1;
      }
      if (right.id === urlTargetId) {
        return 1;
      }
      return 0;
    });
  }, [reviewsQuery.data?.items, searchText, status, urlTargetId]);

  const traceItems = useMemo(
    () =>
      buildModerationTraceItems([
        {
          label: "待处理队列",
          count: (reviewsQuery.data?.items ?? []).filter((item) => item.status === "pending").length,
          tone: "warning"
        },
        {
          label: "当前可见",
          count: (reviewsQuery.data?.items ?? []).filter((item) => item.status === "visible").length,
          tone: "success",
          hideWhenZero: true
        },
        {
          label: "已隐藏",
          count: (reviewsQuery.data?.items ?? []).filter((item) => item.status === "hidden").length,
          hideWhenZero: true
        }
      ]),
    [reviewsQuery.data?.items]
  );

  async function handleModerationModeChange(mode: "manual" | "ai" | "automatic") {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      if (!current) {
        return;
      }

      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(current, {
          moderationModes: { review: mode }
        })
      );
      await Promise.all([siteSettingsQuery.refetch(), reviewsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新评测审核模式失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      actions={
        <>
          <Input.Search
            allowClear
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
            placeholder="搜索机型、作者或评测内容"
            style={{ width: 260 }}
            value={searchText}
          />
          <Segmented
            onChange={(value) => {
              setStatus(value as ReviewStatusFilter);
              setSearchParams((current) => {
                const next = new URLSearchParams(current);
                if (value === "all") {
                  next.delete("status");
                } else {
                  next.set("status", String(value));
                }
                return next;
              });
            }}
            options={[...reviewStatusOptions]}
            value={status}
          />
        </>
      }
      description="评测页现在可直接承接消息 / 待办跳转，复用 status 与 targetId 查询参数。"
      title="评测管理"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel
        description="开启表示新评测先走 AI 审核；关闭表示新评测直接进入人工审核队列。"
        title="当前模式"
      >
        <AdminModerationCard
          aiCopy="新评测会先进入 AI 审核；仍需人工处理的对象会继续停留在当前待审队列。"
          description="切换后只影响新的评测提交，现有列表继续展示最终状态。"
          mode={siteSettingsQuery.data?.item.moderationModes.review ?? "ai"}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新评测会直接进入人工审核队列，不再按“自动通过”语义处理。"
          onModeChange={(mode) => {
            void handleModerationModeChange(mode);
          }}
          pendingCount={(reviewsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          traceHint={MODERATION_TRACE_PLACEHOLDER}
          traceItems={traceItems}
          title="评测审核"
        />
      </AdminPanel>

      <AdminPanel
        description="展示当前聚焦评测对应的最新 AI 审核记录；如为空，说明该对象还没有落到审核记录链路。"
        title="审核追踪"
      >
        {auditQuery.data?.items?.length ? (
          <Table
            bordered
            columns={[
              {
                dataIndex: "status",
                key: "status",
                title: "状态",
                width: 160
              },
              {
                dataIndex: "suggestion",
                key: "suggestion",
                render: (value: string | null) => value ?? "—",
                title: "建议",
                width: 120
              },
              {
                dataIndex: "scene",
                key: "scene",
                render: (value: string | null) => value ?? "—",
                title: "场景",
                width: 140
              },
              {
                dataIndex: "errorMessage",
                key: "errorMessage",
                render: (value: string | null) => value ?? "—",
                title: "错误信息"
              },
              {
                dataIndex: "updatedAt",
                key: "updatedAt",
                title: "更新时间",
                width: 180
              }
            ]}
            dataSource={auditQuery.data.items.map((item) => ({ ...item, key: item.id }))}
            loading={auditQuery.isFetching}
            pagination={false}
            rowKey="id"
            size="small"
          />
        ) : (
          <div className="admin-table-empty">{MODERATION_TRACE_PLACEHOLDER}</div>
        )}
      </AdminPanel>

      <AdminPanel title="评测列表">
        <Table
          bordered
          columns={[
            {
              key: "model",
              render: (_, record: ReviewRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.model.name}</div>
                  <div className="admin-table-subtitle">{record.author.displayName}</div>
                </div>
              ),
              title: "机型 / 作者"
            },
            {
              dataIndex: "content",
              key: "content",
              render: (value: string | null) => value ?? "该评测当前没有补充正文。",
              title: "评测内容"
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: ReviewRecord["status"]) => {
                const meta = reviewStatusLabel(value);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: ReviewRecord) => (
                <Button
                  onClick={() => {
                    setError(null);
                    void apiClient
                      .updateReviewStatus(record.id, {
                        status: record.status === "visible" ? "hidden" : "visible"
                      })
                      .then(() => {
                        void reviewsQuery.refetch();
                      })
                      .catch((reason: unknown) => {
                        setError(reason instanceof Error ? reason.message : "更新评测状态失败");
                      });
                  }}
                  size="small"
                  type={record.status === "visible" ? "default" : "primary"}
                >
                  {record.status === "visible" ? "隐藏" : record.status === "pending" ? "通过显示" : "恢复显示"}
                </Button>
              ),
              title: "操作",
              width: 120
            }
          ]}
          dataSource={filteredItems}
          loading={reviewsQuery.isLoading}
          rowClassName={(record) => (record.id === urlTargetId ? "admin-table-row--target" : "")}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
