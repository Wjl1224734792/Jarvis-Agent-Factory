import { useQuery } from "@tanstack/react-query";
import { Button, Select, Table } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "可见", value: "visible" },
  { label: "已隐藏", value: "hidden" }
] as const;

type CommentStatusFilter = (typeof statusOptions)[number]["value"];
type CommentRecord = Awaited<ReturnType<typeof apiClient.listAdminPostComments>>["items"][number];

function commentStatusLabel(status: CommentRecord["status"]) {
  switch (status) {
    case "pending":
      return "待审核";
    case "visible":
      return "可见";
    case "hidden":
      return "已隐藏";
  }
}

export function PostCommentsPage() {
  const [status, setStatus] = useState<CommentStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const commentsQuery = useQuery({
    queryKey: ["admin-post-comments", status],
    queryFn: () => apiClient.listAdminPostComments(status === "all" ? undefined : status)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-post-comments", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  function updateStatus(id: string, nextStatus: "visible" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostCommentStatus(id, {
        status: nextStatus
      })
      .then(() => {
        void commentsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新评论状态失败");
      });
  }

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      await apiClient.updateSiteSettings({
        postModerationEnabled: current?.postModerationEnabled ?? true,
        commentModerationEnabled: enabled,
        reviewModerationEnabled: current?.reviewModerationEnabled ?? true,
        submissionModerationEnabled: current?.submissionModerationEnabled ?? true
      });
      await Promise.all([siteSettingsQuery.refetch(), commentsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新评论审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Select
          onChange={(value) => {
            setStatus(value);
          }}
          options={statusOptions as unknown as Array<{ label: string; value: string }>}
          style={{ width: 180 }}
          value={status}
        />
      }
      description="管理帖子评论与回复的显示状态。"
      title="评论审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="人工审核模式下，评论提交后会先停留在待审核状态。" title="当前模式">
        <AdminModerationCard
          autoCopy="评论和回复将直接显示。"
          description="适合评论量较大时快速放开评论展示。"
          enabled={siteSettingsQuery.data?.item.commentModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="评论和回复会先进入待审核状态。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(commentsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          title="评论审核"
        />
      </AdminPanel>

      <AdminPanel title="评论列表">
        <Table
          bordered
          columns={[
            {
              key: "postTitle",
              render: (_, record: CommentRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.postTitle}</div>
                  <div className="admin-table-subtitle">
                    {record.author.displayName} · {record.parentCommentId ? "回复" : "主评论"}
                  </div>
                </div>
              ),
              title: "评论对象"
            },
            {
              dataIndex: "content",
              key: "content",
              title: "内容"
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: CommentRecord["status"]) => commentStatusLabel(value),
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: CommentRecord) => (
                <Button
                  onClick={() => {
                    updateStatus(record.id, record.status === "visible" ? "hidden" : "visible");
                  }}
                  size="small"
                  type={record.status === "visible" ? "default" : "primary"}
                >
                  {record.status === "visible" ? "隐藏" : "通过 / 恢复"}
                </Button>
              ),
              title: "操作",
              width: 120
            }
          ]}
          dataSource={commentsQuery.data?.items ?? []}
          loading={commentsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
