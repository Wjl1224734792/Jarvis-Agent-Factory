import { useQuery } from "@tanstack/react-query";
import { Button, Image, Input, Modal, Select, Space, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";
import {
  buildModerationTraceItems,
  MODERATION_TRACE_PLACEHOLDER
} from "../../lib/moderation-tracking";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type SubmissionRecord = Awaited<ReturnType<typeof apiClient.listAdminAircraftSubmissions>>["items"][number];

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "submitted" },
  { label: "已通过", value: "approved" },
  { label: "已驳回", value: "rejected" }
] as const;

type SubmissionStatusFilter = (typeof statusOptions)[number]["value"];

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

function formatPriceRange(priceMin: number | null, priceMax: number | null) {
  if (priceMin === null || priceMax === null) {
    return "未填写";
  }

  if (priceMin === priceMax) {
    return `¥${priceMin.toLocaleString("zh-CN")}`;
  }

  return `¥${priceMin.toLocaleString("zh-CN")} - ¥${priceMax.toLocaleString("zh-CN")}`;
}

export function AircraftSubmissionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlTargetId = searchParams.get("targetId");
  const [status, setStatus] = useState<SubmissionStatusFilter>(
    urlStatus === "submitted" || urlStatus === "approved" || urlStatus === "rejected"
      ? urlStatus
      : "all"
  );
  const [error, setError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    setStatus(
      urlStatus === "submitted" || urlStatus === "approved" || urlStatus === "rejected"
        ? urlStatus
        : "all"
    );
  }, [urlStatus]);

  useEffect(() => {
    setDetailId(urlTargetId);
  }, [urlTargetId]);

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
    queryFn: () => {
      if (!detailId) {
        throw new Error("Missing aircraft submission id.");
      }
      return apiClient.getAircraftSubmission(detailId);
    },
    enabled: Boolean(detailId)
  });
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = (submissionsQuery.data?.items ?? []).filter((item) =>
      status === "all" ? true : item.status === status
    );
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [
        item.modelName,
        item.author.displayName,
        item.brand?.name ?? "",
        item.proposedBrandName ?? "",
        item.summary ?? "",
        item.description ?? ""
      ].some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [submissionsQuery.data?.items, searchText, status]);
  const traceItems = useMemo(
    () =>
      buildModerationTraceItems([
        {
          label: "待处理队列",
          count: (submissionsQuery.data?.items ?? []).filter((item) => item.status === "submitted").length,
          tone: "warning"
        },
        {
          label: "已通过",
          count: (submissionsQuery.data?.items ?? []).filter((item) => item.status === "approved").length,
          tone: "success",
          hideWhenZero: true
        },
        {
          label: "已驳回",
          count: (submissionsQuery.data?.items ?? []).filter((item) => item.status === "rejected").length,
          hideWhenZero: true
        }
      ]),
    [submissionsQuery.data?.items]
  );

  function updateStatus(id: string, status: "approved" | "rejected", rejectionReason?: string | null) {
    setError(null);
    void apiClient
      .updateAircraftSubmissionStatus(id, {
        status,
        rejectionReason: status === "rejected" ? rejectionReason ?? null : null
      })
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
    <AdminPage
      actions={
        <Space wrap>
          <Input.Search
          allowClear
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          placeholder="搜索机型、品牌、投稿人或摘要"
          style={{ width: 280 }}
          value={searchText}
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
            style={{ width: 160 }}
            value={status}
          />
        </Space>
      }
      description="集中处理用户提交的飞行器资料与机型投稿审核。"
      title="机型投稿审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel
        description="机型投稿使用独立审核开关，和总览页保持同步。"
        title="当前模式"
      >
        <AdminModerationCard
          aiCopy="新投稿会先进入 AI 审核；仍需人工处理的对象会继续保留在当前队列。"
          description="当前页先展示已接入的状态流转与队列数量。"
          enabled={siteSettingsQuery.data?.item.modelModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新投稿会直接保持 submitted 状态，等待人工审核。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(submissionsQuery.data?.items ?? []).filter((item) => item.status === "submitted").length}
          traceHint={MODERATION_TRACE_PLACEHOLDER}
          traceItems={traceItems}
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
              key: "price",
              render: (_, record: SubmissionRecord) =>
                formatPriceRange(record.priceMin ?? null, record.priceMax ?? null),
              title: "价格",
              width: 180
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
                      <Button
                        onClick={() => {
                          const reason = promptRejectionReason();
                          if (!reason) {
                            return;
                          }
                          updateStatus(record.id, "rejected", reason);
                        }}
                        size="small"
                      >
                        驳回
                      </Button>
                    </>
                  ) : null}
                  {record.status === "approved" ? (
                    <Button
                      onClick={() => {
                        const reason = promptRejectionReason();
                        if (!reason) {
                          return;
                        }
                        updateStatus(record.id, "rejected", reason);
                      }}
                      size="small"
                    >
                      驳回
                    </Button>
                  ) : null}
                  {record.status === "rejected" ? (
                    <Button onClick={() => updateStatus(record.id, "approved")} size="small">
                      恢复通过
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 220
            }
          ]}
          dataSource={filteredItems}
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
            <div className="admin-detail-sheet__meta">
              <span>{formatPriceRange(detailQuery.data.item.priceMin ?? null, detailQuery.data.item.priceMax ?? null)}</span>
              <span>
                {detailQuery.data.item.brand?.name ?? detailQuery.data.item.proposedBrandName ?? "待补品牌"}
              </span>
            </div>
            <div className="admin-detail-sheet__body">
              <p>{detailQuery.data.item.description ?? detailQuery.data.item.summary ?? "暂无详细描述"}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
