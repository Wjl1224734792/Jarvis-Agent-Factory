import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Modal, Space, Table, Tag } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type BrandApplicationRecord = Awaited<
  ReturnType<typeof apiClient.listAdminBrandApplications>
>["items"][number];

function statusLabel(status: BrandApplicationRecord["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "approved":
      return { color: "green", text: "已通过" };
    case "rejected":
      return { color: "red", text: "已驳回" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

export function BrandApplicationsPage() {
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const applicationsQuery = useQuery({
    queryKey: ["admin-brand-applications"],
    queryFn: () => apiClient.listAdminBrandApplications()
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-brand-applications", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-brand-application-detail", detailId],
    queryFn: () => apiClient.getBrandApplication(detailId!),
    enabled: Boolean(detailId)
  });

  async function updateStatus(id: string, status: "approved" | "rejected" | "hidden") {
    setError(null);
    try {
      await apiClient.updateBrandApplicationStatus(id, { status });
      await applicationsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "更新品牌申请状态失败");
    }
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
          brandModerationEnabled: enabled
        })
      );
      await Promise.all([siteSettingsQuery.refetch(), applicationsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新品牌审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      description="品牌申请从机型投稿里拆分出来，单独在这里审核并沉淀到品牌库。"
      title="品牌申请审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="品牌申请使用独立审核开关，和总览中心保持同步。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新的品牌申请会直接沉淀到品牌库。"
          description="开启人工审核后，品牌申请会单独进入品牌申请队列。"
          enabled={siteSettingsQuery.data?.item.brandModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的品牌申请会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(applicationsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          title="品牌申请审核"
        />
      </AdminPanel>

      <AdminPanel title="申请列表">
        <Table
          bordered
          columns={[
            {
              key: "logo",
              render: (_, record: BrandApplicationRecord) =>
                record.logoUrl ? (
                  <Image alt={record.name} height={64} preview={false} src={record.logoUrl} width={64} />
                ) : (
                  <div className="admin-cover-thumb admin-cover-thumb--empty">无 Logo</div>
                ),
              title: "Logo",
              width: 96
            },
            {
              key: "name",
              render: (_, record: BrandApplicationRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.name}</div>
                  <div className="admin-table-subtitle">
                    {record.slug} 路 {record.applicant.displayName}
                  </div>
                </div>
              ),
              title: "品牌申请"
            },
            {
              dataIndex: "description",
              key: "description",
              render: (value: string | null) => value ?? "申请人未补充说明",
              title: "说明"
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: BrandApplicationRecord["status"]) => {
                const meta = statusLabel(value);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: BrandApplicationRecord) => (
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
                  {record.status !== "approved" ? (
                    <Button onClick={() => void updateStatus(record.id, "approved")} size="small" type="primary">
                      通过
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button onClick={() => void updateStatus(record.id, "rejected")} size="small">
                      驳回
                    </Button>
                  ) : null}
                  {record.status !== "hidden" ? (
                    <Button danger onClick={() => void updateStatus(record.id, "hidden")} size="small">
                      隐藏
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 220
            }
          ]}
          dataSource={applicationsQuery.data?.items ?? []}
          locale={{
            emptyText: <Empty description="暂时还没有品牌申请" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          }}
          loading={applicationsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>

      <Modal
        footer={null}
        onCancel={() => setDetailId(null)}
        open={Boolean(detailId)}
        title="品牌申请详情"
        width={760}
      >
        {detailQuery.data?.item ? (
          <div className="admin-detail-sheet">
            {detailQuery.data.item.logoUrl ? (
              <Image
                alt={detailQuery.data.item.name}
                className="admin-detail-sheet__logo"
                preview={false}
                src={detailQuery.data.item.logoUrl}
              />
            ) : (
              <div className="admin-detail-sheet__logo admin-detail-sheet__logo--empty">暂无 Logo</div>
            )}
            <div className="admin-detail-sheet__meta">
              <Tag>{statusLabel(detailQuery.data.item.status).text}</Tag>
              <span>{detailQuery.data.item.applicant.displayName}</span>
            </div>
            <h3 className="admin-detail-sheet__title">{detailQuery.data.item.name}</h3>
            <div className="admin-detail-sheet__body">
              <p>{detailQuery.data.item.description ?? "申请人未补充说明"}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
