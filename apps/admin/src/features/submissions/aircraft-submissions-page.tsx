import { useQuery } from "@tanstack/react-query";
import { Button, Image, Modal, Space, Table, Tag } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

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
  const [detailId, setDetailId] = useState<string | null>(null);

  const submissionsQuery = useQuery({
    queryKey: ["admin-aircraft-submissions"],
    queryFn: () => apiClient.listAdminAircraftSubmissions()
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-aircraft-submissions", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-aircraft-submission-detail", detailId],
    queryFn: () => apiClient.getAircraftSubmission(detailId!),
    enabled: Boolean(detailId)
  });

  function updateStatus(id: string, status: "approved" | "rejected") {
    setError(null);
    void apiClient
      .updateAircraftSubmissionStatus(id, { status })
      .then(() => {
        void Promise.all([submissionsQuery.refetch(), detailQuery.refetch()]);
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
      if (!current) {
        return;
      }

      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(current, {
          modelModerationEnabled: enabled
        })
      );
      await Promise.all([siteSettingsQuery.refetch(), submissionsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新投稿审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage description="集中处理用户提交的飞行器资料与机型投稿审核。" title="机型投稿审核">
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="机型投稿使用独立审核开关，和总览中心保持同步。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新的投稿会自动进入通过链路。"
          description="开启人工审核后，新的投稿会先进入待审核队列。"
          enabled={siteSettingsQuery.data?.item.modelModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的机型投稿会保持 submitted 状态，等待人工审核。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(submissionsQuery.data?.items ?? []).filter((item) => item.status === "submitted").length}
          title="机型投稿审核"
        />
      </AdminPanel>

      <AdminPanel title="投稿列表">
        <Table
          bordered
          columns={[
            {
              key: "cover",
              render: (_, record: SubmissionRecord) =>
                record.coverImageUrl ? (
                  <Image alt={record.modelName} height={64} preview={false} src={record.coverImageUrl} width={96} />
                ) : (
                  <div className="admin-cover-thumb admin-cover-thumb--empty">无封面</div>
                ),
              title: "封面",
              width: 120
            },
            {
              key: "model",
              render: (_, record: SubmissionRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.modelName}</div>
                  <div className="admin-table-subtitle">
                    {record.brand?.name ?? record.proposedBrandName ?? "待补品牌"} 路 {record.category.name}
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
              render: (value: SubmissionRecord["status"]) => <Tag>{submissionStatusLabel(value)}</Tag>,
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: SubmissionRecord) => (
                <Space size="small" wrap>
                  <Button
                    onClick={() => {
                      setDetailId(record.id);
                    }}
                    size="small"
                    type="link"
                  >
                    详情
                  </Button>
                  {record.status === "submitted" ? (
                    <>
                      <Button onClick={() => updateStatus(record.id, "approved")} size="small" type="primary">
                        通过上架
                      </Button>
                      <Button onClick={() => updateStatus(record.id, "rejected")} size="small">
                        驳回
                      </Button>
                    </>
                  ) : null}
                  {record.status === "approved" ? (
                    <Button onClick={() => updateStatus(record.id, "rejected")} size="small">
                      改为驳回
                    </Button>
                  ) : null}
                  {record.status === "rejected" ? (
                    <Button onClick={() => updateStatus(record.id, "approved")} size="small">
                      重新通过
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 220
            }
          ]}
          dataSource={submissionsQuery.data?.items ?? []}
          loading={submissionsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>

      <Modal
        footer={null}
        onCancel={() => setDetailId(null)}
        open={Boolean(detailId)}
        title="投稿详情"
        width={900}
      >
        {detailQuery.data?.item ? (
          <div className="admin-detail-sheet">
            {detailQuery.data.item.coverImageUrl ? (
              <Image
                alt={detailQuery.data.item.modelName}
                className="admin-detail-sheet__cover"
                preview={false}
                src={detailQuery.data.item.coverImageUrl}
              />
            ) : (
              <div className="admin-detail-sheet__cover admin-detail-sheet__cover--empty">暂无封面</div>
            )}
            <div className="admin-detail-sheet__meta">
              <Tag>{submissionStatusLabel(detailQuery.data.item.status)}</Tag>
              <span>{detailQuery.data.item.author.displayName}</span>
            </div>
            <h3 className="admin-detail-sheet__title">{detailQuery.data.item.modelName}</h3>
            <div className="admin-detail-sheet__body">
              <p>{detailQuery.data.item.description ?? detailQuery.data.item.summary ?? "暂无详细描述"}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
