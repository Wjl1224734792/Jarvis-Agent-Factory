import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Input, Modal, Segmented, Space, Table, Tag } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type ItemStatus = "pending" | "published" | "rejected" | "hidden";
type RatingTargetRecord = Awaited<
  ReturnType<typeof apiClient.listRatingTargetsForModeration>
>["items"][number];

const itemStatusOptions: Array<{ label: string; value: ItemStatus | "all" }> = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已发布", value: "published" },
  { label: "已驳回", value: "rejected" },
  { label: "已隐藏", value: "hidden" }
];

function itemStatusLabel(status: RatingTargetRecord["status"] = "published") {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "published":
      return { color: "green", text: "已发布" };
    case "rejected":
      return { color: "red", text: "已驳回" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

export function RatingTargetsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlTargetId = searchParams.get("targetId");
  const urlRankingId = searchParams.get("rankingId");
  const [status, setStatus] = useState<ItemStatus | "all">(
    urlStatus === "pending" || urlStatus === "published" || urlStatus === "rejected" || urlStatus === "hidden"
      ? urlStatus
      : "all"
  );
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    setStatus(
      urlStatus === "pending" || urlStatus === "published" || urlStatus === "rejected" || urlStatus === "hidden"
        ? urlStatus
        : "all"
    );
  }, [urlStatus]);

  useEffect(() => {
    setDetailId(urlTargetId);
  }, [urlTargetId]);

  const itemsQuery = useQuery({
    queryKey: ["admin-rating-targets", status],
    queryFn: () => apiClient.listRatingTargetsForModeration(status === "all" ? undefined : status)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-rating-targets", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-rating-target-detail", detailId],
    queryFn: () => {
      if (!detailId) {
        throw new Error("Missing rating target id.");
      }
      return apiClient.getRatingTargetDetail(detailId);
    },
    enabled: Boolean(detailId)
  });

  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = (itemsQuery.data?.items ?? []).filter((item) =>
      urlRankingId ? item.rankingId === urlRankingId : true
    );
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.rankingTitle, item.rankingAuthorName, item.brandName ?? ""].some((value) =>
        String(value).toLowerCase().includes(keyword)
      )
    );
  }, [itemsQuery.data?.items, searchText, urlRankingId]);

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
          ratingTargetModerationEnabled: enabled
        })
      );
      await Promise.all([siteSettingsQuery.refetch(), itemsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新评分对象审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function updateItemStatus(
    id: string,
    nextStatus: "published" | "rejected" | "hidden",
    rejectionReason?: string | null
  ) {
    setActionError(null);
    try {
      await apiClient.updateRatingTargetStatus(id, {
        status: nextStatus,
        rejectionReason: nextStatus === "rejected" ? rejectionReason ?? null : null
      });
      await Promise.all([itemsQuery.refetch(), detailQuery.refetch()]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "更新评分对象状态失败");
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
            placeholder="搜索评分对象、所属榜单、作者或品牌"
            style={{ width: 300 }}
            value={searchText}
          />
          <Segmented
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
            options={itemStatusOptions}
            value={status}
          />
        </Space>
      }
      description="把评分对象从榜单审核里拆出来，单独处理评分对象通过、驳回返修和下线隐藏。"
      title="评分对象审核"
    >
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}
      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <AdminPanel description="评分对象使用独立审核开关，和总览中心保持同步。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新评分对象会直接进入已发布状态。"
          description="开启人工审核后，新评分对象会先进入审核队列。"
          enabled={siteSettingsQuery.data?.item.ratingTargetModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的评分对象会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(itemsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          title="评分对象审核"
        />
      </AdminPanel>

      <AdminPanel title="评分对象列表">
        <Table
          bordered
          columns={[
            {
              key: "cover",
              render: (_, record: RatingTargetRecord) =>
                record.imageUrl ? (
                  <Image alt={record.title} height={64} preview={false} src={record.imageUrl} width={96} />
                ) : (
                  <div className="admin-cover-thumb admin-cover-thumb--empty">暂无封面</div>
                ),
              title: "封面",
              width: 120
            },
            {
              key: "item",
              render: (_, record: RatingTargetRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">
                    {record.rankingTitle} · #{record.rank}
                  </div>
                </div>
              ),
              title: "评分对象"
            },
            {
              key: "owner",
              render: (_, record: RatingTargetRecord) => record.rankingAuthorName,
              title: "榜单作者",
              width: 140
            },
            {
              key: "meta",
              render: (_, record: RatingTargetRecord) =>
                record.brandName ?? record.linkedModel?.brand.name ?? "未填写品牌",
              title: "品牌",
              width: 160
            },
            {
              key: "reports",
              render: (_, record: RatingTargetRecord) =>
                (record.reportCount ?? 0) > 0 ? <Tag color="red">举报 {record.reportCount}</Tag> : <span>-</span>,
              title: "举报",
              width: 110
            },
            {
              key: "status",
              render: (_, record: RatingTargetRecord) => {
                const meta = itemStatusLabel(record.status);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: RatingTargetRecord) => (
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
                  <Button href={`/admin/rankings/${record.rankingId}`} size="small" type="link">
                    所属榜单
                  </Button>
                  {record.status !== "published" ? (
                    <Button
                      onClick={() => {
                        void updateItemStatus(record.id, "published");
                      }}
                      size="small"
                      type="link"
                    >
                      {record.status === "pending" ? "通过发布" : "恢复发布"}
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button
                      danger
                      onClick={() => {
                        const reason = promptRejectionReason();
                        if (!reason) {
                          return;
                        }
                        void updateItemStatus(record.id, "rejected", reason);
                      }}
                      size="small"
                      type="link"
                    >
                      驳回返修
                    </Button>
                  ) : null}
                  {record.status === "published" ? (
                    <Button
                      onClick={() => {
                        void updateItemStatus(record.id, "hidden");
                      }}
                      size="small"
                      type="link"
                    >
                      下线隐藏
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 260
            }
          ]}
          dataSource={filteredItems}
          locale={{ emptyText: <Empty description="当前筛选下没有评分对象" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={itemsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>

      <Modal
        footer={null}
        onCancel={() => setDetailId(null)}
        open={Boolean(detailId)}
        title="评分对象详情"
        width={860}
      >
        {detailQuery.data?.item ? (
          <div className="admin-detail-sheet">
            {detailQuery.data.item.imageUrl ? (
              <Image
                alt={detailQuery.data.item.title}
                className="admin-detail-sheet__cover"
                preview={false}
                src={detailQuery.data.item.imageUrl}
              />
            ) : (
              <div className="admin-detail-sheet__cover admin-detail-sheet__cover--empty">暂无封面</div>
            )}
            <div className="admin-detail-sheet__meta">
              <Tag>{itemStatusLabel(detailQuery.data.item.status).text}</Tag>
              {(detailQuery.data.item.reportCount ?? 0) > 0 ? (
                <Tag color="red">举报 {detailQuery.data.item.reportCount}</Tag>
              ) : null}
            </div>
            <h3 className="admin-detail-sheet__title">{detailQuery.data.item.title}</h3>
            <div className="admin-detail-sheet__body">
              <p>{detailQuery.data.item.summary ?? "暂无摘要"}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
