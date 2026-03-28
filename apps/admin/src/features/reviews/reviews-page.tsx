import { useQuery } from "@tanstack/react-query";
import { Button, Table } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type ReviewRecord = Awaited<ReturnType<typeof apiClient.listAdminReviews>>["items"][number];

export function ReviewsPage() {
  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => apiClient.listAdminReviews()
  });
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-reviews", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      await apiClient.updateSiteSettings({
        postModerationEnabled: current?.postModerationEnabled ?? true,
        commentModerationEnabled: current?.commentModerationEnabled ?? true,
        reviewModerationEnabled: enabled,
        submissionModerationEnabled: current?.submissionModerationEnabled ?? true
      });
      await Promise.all([siteSettingsQuery.refetch(), reviewsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新点评审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage description="控制点评的可见性和公开展示状态。" title="点评治理">
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel
        description="人工审核模式下，点评提交后只对作者本人显示待审状态。"
        title="当前模式"
      >
        <AdminModerationCard
          autoCopy="机型点评直接公开。"
          description="切换后会影响新的点评提交。"
          enabled={siteSettingsQuery.data?.item.reviewModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="机型点评提交后先进入待审核。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(reviewsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          title="点评审核"
        />
      </AdminPanel>

      <AdminPanel title="点评列表">
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
              render: (value: string | null) => value ?? "该评论当前没有补充正文。",
              title: "评论内容"
            },
            {
              dataIndex: "status",
              key: "status",
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
                        setError(reason instanceof Error ? reason.message : "更新点评状态失败");
                      });
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
          dataSource={reviewsQuery.data?.items ?? []}
          loading={reviewsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
