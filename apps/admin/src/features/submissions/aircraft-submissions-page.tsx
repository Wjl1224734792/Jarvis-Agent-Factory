import { useQuery } from "@tanstack/react-query";
import { Button, Space, Table } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type SubmissionRecord = Awaited<ReturnType<typeof apiClient.listAdminAircraftSubmissions>>["items"][number];

function submissionStatusLabel(status: SubmissionRecord["status"]) {
  switch (status) {
    case "submitted":
      return "待审核";
    case "approved":
      return "已通过";
    case "rejected":
      return "已驳回";
  }
}

export function AircraftSubmissionsPage() {
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const submissionsQuery = useQuery({
    queryKey: ["admin-aircraft-submissions"],
    queryFn: () => apiClient.listAdminAircraftSubmissions()
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-aircraft-submissions", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

  function updateStatus(id: string, status: "approved" | "rejected") {
    setError(null);
    void apiClient
      .updateAircraftSubmissionStatus(id, { status })
      .then(() => {
        void submissionsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新投稿状态失败");
      });
  }

  async function updateModeration(enabled: boolean) {
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const current = siteSettingsQuery.data?.item;
      await apiClient.updateSiteSettings({
        postModerationEnabled: current?.postModerationEnabled ?? true,
        commentModerationEnabled: current?.commentModerationEnabled ?? true,
        reviewModerationEnabled: current?.reviewModerationEnabled ?? true,
        submissionModerationEnabled: enabled
      });
      await Promise.all([siteSettingsQuery.refetch(), submissionsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新投稿审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage description="集中处理用户提交的飞行器资料与投稿审核。" title="飞行器投稿审核">
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="关闭人工审核后，新的飞行器投稿会自动进入通过链路。" title="当前模式">
        <AdminModerationCard
          autoCopy="新的飞行器投稿会自动通过。"
          description="开启人工审核更适合控制数据质量与补充资料。"
          enabled={siteSettingsQuery.data?.item.submissionModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的飞行器投稿会保持 submitted 状态，等待人工审核。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(submissionsQuery.data?.items ?? []).filter((item) => item.status === "submitted").length}
          title="投稿审核"
        />
      </AdminPanel>

      <AdminPanel title="投稿列表">
        <Table
          bordered
          columns={[
            {
              key: "model",
              render: (_, record: SubmissionRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.modelName}</div>
                  <div className="admin-table-subtitle">
                    {record.brand?.name ?? record.proposedBrandName ?? "待补充品牌"} · {record.category.name}
                  </div>
                </div>
              ),
              title: "投稿对象"
            },
            {
              key: "summary",
              render: (_, record: SubmissionRecord) =>
                record.summary ?? record.description ?? "投稿人暂未补充摘要。",
              title: "摘要"
            },
            {
              key: "author",
              render: (_, record: SubmissionRecord) => record.author.displayName,
              title: "投稿人",
              width: 120
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: SubmissionRecord["status"]) => submissionStatusLabel(value),
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: SubmissionRecord) => (
                <Space size="small" wrap>
                  {record.status !== "approved" ? (
                    <Button onClick={() => updateStatus(record.id, "approved")} size="small" type="primary">
                      通过
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button onClick={() => updateStatus(record.id, "rejected")} size="small">
                      驳回
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 160
            }
          ]}
          dataSource={submissionsQuery.data?.items ?? []}
          loading={submissionsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
