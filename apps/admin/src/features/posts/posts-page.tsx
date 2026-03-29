import { useQuery } from "@tanstack/react-query";
import { Button, Select, Space, Table } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已发布", value: "published" },
  { label: "已驳回", value: "rejected" },
  { label: "已隐藏", value: "hidden" }
] as const;

type PostStatusFilter = (typeof statusOptions)[number]["value"];
type PostRecord = Awaited<ReturnType<typeof apiClient.listAdminPosts>>["items"][number];

function postStatusLabel(status: PostRecord["status"]) {
  switch (status) {
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已驳回";
    case "hidden":
      return "已隐藏";
  }
}

export function PostsPage() {
  const [status, setStatus] = useState<PostStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const postsQuery = useQuery({
    queryKey: ["admin-posts", status],
    queryFn: () => apiClient.listAdminPosts(status === "all" ? undefined : status)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-posts", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  function updateStatus(id: string, nextStatus: "published" | "rejected" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostStatus(id, {
        status: nextStatus
      })
      .then(() => {
        void postsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新帖子状态失败");
      });
  }

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      await apiClient.updateSiteSettings({
        postModerationEnabled: enabled,
        commentModerationEnabled: current?.commentModerationEnabled ?? true,
        reviewModerationEnabled: current?.reviewModerationEnabled ?? true,
        submissionModerationEnabled: current?.submissionModerationEnabled ?? true
      });
      await Promise.all([siteSettingsQuery.refetch(), postsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新帖子审核开关失败");
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
      description="按状态审核帖子，控制发布、驳回与隐藏。"
      title="帖子审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="帖子与动态共用这一套自动审核规则。" title="当前模式">
        <AdminModerationCard
          autoCopy="普通用户文章和动态将直接公开。"
          description="切换后会影响新的帖子与动态投稿。"
          enabled={siteSettingsQuery.data?.item.postModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="普通用户文章和动态会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(postsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          title="帖子审核"
        />
      </AdminPanel>

      <AdminPanel title="帖子列表">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: PostRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">
                    {record.author.displayName} · 评论 {record.commentCount} · 举报 {record.reportCount}
                  </div>
                </div>
              ),
              title: "帖子"
            },
            {
              dataIndex: "contentPreview",
              key: "contentPreview",
              title: "摘要"
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: PostRecord["status"]) => postStatusLabel(value),
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: PostRecord) => (
                <Space size="small" wrap>
                  {record.status !== "published" ? (
                    <Button onClick={() => updateStatus(record.id, "published")} size="small" type="primary">
                      通过
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button onClick={() => updateStatus(record.id, "rejected")} size="small">
                      驳回
                    </Button>
                  ) : null}
                  {record.status !== "hidden" ? (
                    <Button danger onClick={() => updateStatus(record.id, "hidden")} size="small">
                      隐藏
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 240
            }
          ]}
          dataSource={postsQuery.data?.items ?? []}
          loading={postsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
