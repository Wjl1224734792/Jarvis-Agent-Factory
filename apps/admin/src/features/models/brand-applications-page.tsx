import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Input, Modal, Select, Space, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type BrandApplicationRecord = Awaited<
  ReturnType<typeof apiClient.listAdminBrandApplications>
>["items"][number];

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" }
] as const;

type BrandApplicationStatusFilter = (typeof statusOptions)[number]["value"];

function statusMeta(status: BrandApplicationRecord["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "Pending" };
    case "approved":
      return { color: "green", text: "Approved" };
    case "rejected":
      return { color: "red", text: "Rejected" };
  }
}

function normalizeStatusFilter(status: string | null): BrandApplicationStatusFilter {
  return status === "pending" || status === "approved" || status === "rejected" ? status : "all";
}

export function BrandApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<BrandApplicationStatusFilter>(
    normalizeStatusFilter(searchParams.get("status"))
  );
  const [detailId, setDetailId] = useState<string | null>(searchParams.get("targetId"));
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setStatus(normalizeStatusFilter(searchParams.get("status")));
  }, [searchParams]);

  useEffect(() => {
    setDetailId(searchParams.get("targetId"));
  }, [searchParams]);

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
    queryFn: () => {
      if (!detailId) {
        throw new Error("Missing brand application id.");
      }
      return apiClient.getBrandApplication(detailId);
    },
    enabled: Boolean(detailId)
  });

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = (applicationsQuery.data?.items ?? []).filter((item) =>
      status === "all" ? true : item.status === status
    );

    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.name, item.slug, item.applicant.displayName, item.description ?? ""]
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [applicationsQuery.data?.items, searchText, status]);

  async function updateStatus(
    id: string,
    nextStatus: "approved" | "rejected",
    rejectionReason?: string | null
  ) {
    setError(null);
    try {
      await apiClient.updateBrandApplicationStatus(id, {
        status: nextStatus,
        rejectionReason: nextStatus === "rejected" ? rejectionReason ?? null : null
      });
      await applicationsQuery.refetch();
      if (detailId === id) {
        await detailQuery.refetch();
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Failed to update brand application status.");
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
      setSettingsError(reason instanceof Error ? reason.message : "Failed to update moderation setting.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      title="Brand Application Review"
      description="Review community-submitted brand applications and sync approved entries into the brand library."
      actions={
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search by brand, slug, applicant, or description"
            style={{ width: 280 }}
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
          />
          <Select
            options={statusOptions as unknown as Array<{ label: string; value: string }>}
            style={{ width: 160 }}
            value={status}
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
          />
        </Space>
      }
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel
        title="Moderation Mode"
        description="Brand applications use their own moderation switch and remain aligned with the admin overview counters."
      >
        <AdminModerationCard
          title="Brand Application Moderation"
          description="When manual moderation is enabled, new brand applications stay in the review queue."
          manualCopy="New brand applications will enter the moderation queue first."
          autoCopy="When manual moderation is disabled, new brand applications go straight into the brand library."
          enabled={siteSettingsQuery.data?.item.brandModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          pendingCount={(applicationsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          onEnable={() => {
            void updateModeration(true);
          }}
          onDisable={() => {
            void updateModeration(false);
          }}
        />
      </AdminPanel>

      <AdminPanel title="Applications">
        <Table
          bordered
          rowKey={(record) => record.id}
          size="middle"
          loading={applicationsQuery.isLoading}
          dataSource={filteredItems}
          locale={{
            emptyText: <Empty description="No brand applications found." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          }}
          columns={[
            {
              key: "logo",
              title: "Logo",
              width: 96,
              render: (_, record: BrandApplicationRecord) =>
                record.logoUrl ? (
                  <Image alt={record.name} height={64} preview={false} src={record.logoUrl} width={64} />
                ) : (
                  <div className="admin-cover-thumb admin-cover-thumb--empty">No Logo</div>
                )
            },
            {
              key: "name",
              title: "Brand Application",
              render: (_, record: BrandApplicationRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.name}</div>
                  <div className="admin-table-subtitle">
                    {record.slug} / {record.applicant.displayName}
                  </div>
                </div>
              )
            },
            {
              dataIndex: "description",
              key: "description",
              title: "Description",
              render: (value: string | null) => value ?? "No description provided."
            },
            {
              dataIndex: "status",
              key: "status",
              title: "Status",
              width: 120,
              render: (value: BrandApplicationRecord["status"]) => {
                const meta = statusMeta(value);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              }
            },
            {
              key: "action",
              title: "Actions",
              width: 220,
              render: (_, record: BrandApplicationRecord) => (
                <Space size="small" wrap>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setDetailId(record.id);
                    }}
                  >
                    Details
                  </Button>
                  {record.status !== "approved" ? (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        void updateStatus(record.id, "approved");
                      }}
                    >
                      {record.status === "pending" ? "Approve" : "Restore"}
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button
                      size="small"
                      onClick={() => {
                        const reason = promptRejectionReason();
                        if (!reason) {
                          return;
                        }
                        void updateStatus(record.id, "rejected", reason);
                      }}
                    >
                      Reject
                    </Button>
                  ) : null}
                </Space>
              )
            }
          ]}
        />
      </AdminPanel>

      <Modal
        open={Boolean(detailId)}
        title="Brand Application Details"
        width={760}
        footer={null}
        onCancel={() => setDetailId(null)}
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
              <div className="admin-detail-sheet__logo admin-detail-sheet__logo--empty">No Logo</div>
            )}
            <div className="admin-detail-sheet__meta">
              <Tag>{statusMeta(detailQuery.data.item.status).text}</Tag>
              <span>{detailQuery.data.item.applicant.displayName}</span>
            </div>
            <h3 className="admin-detail-sheet__title">{detailQuery.data.item.name}</h3>
            <div className="admin-detail-sheet__body">
              <p>{detailQuery.data.item.description ?? "No description provided."}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
