import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Segmented, Space, Table, Tag } from "antd";
import { useState } from "react";
import { AdminModerationCard } from "../../components/admin-moderation-card";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";

type ItemStatus = "pending" | "published" | "rejected" | "hidden";
type RankingItemRecord = Awaited<
  ReturnType<typeof apiClient.listRankingItemsForModeration>
>["items"][number];

const itemStatusOptions: Array<{ label: string; value: ItemStatus | "all" }> = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已发布", value: "published" },
  { label: "已驳回", value: "rejected" },
  { label: "已隐藏", value: "hidden" }
];

function itemStatusLabel(status: RankingItemRecord["status"] = "published") {
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

export function RankingItemsPage() {
  const [status, setStatus] = useState<ItemStatus | "all">("all");
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const itemsQuery = useQuery({
    queryKey: ["admin-ranking-items", status],
    queryFn: () => apiClient.listRankingItemsForModeration(status === "all" ? undefined : status)
  });
  const siteSettingsQuery = useQuery({
    queryKey: ["admin-ranking-items", "site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });

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
          rankingItemModerationEnabled: enabled
        })
      );
      await Promise.all([siteSettingsQuery.refetch(), itemsQuery.refetch()]);
    } catch (reason: unknown) {
      setSettingsError(reason instanceof Error ? reason.message : "更新条目审核开关失败");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <AdminPage
      actions={
        <Segmented
          onChange={(value) => {
            setStatus(value as ItemStatus | "all");
          }}
          options={itemStatusOptions}
          value={status}
        />
      }
      description="把榜单条目从榜单审核里拆出来，单独查看条目状态与条目队列。"
      title="榜单条目审核"
    >
      {settingsError ? <div className="admin-login__error">{settingsError}</div> : null}

      <AdminPanel description="榜单条目使用独立审核开关，和总览中心保持同步。" title="当前模式">
        <AdminModerationCard
          autoCopy="关闭人工审核后，新条目会直接进入已发布状态。"
          description="开启人工审核后，新增条目会先进入条目审核队列。"
          enabled={siteSettingsQuery.data?.item.rankingItemModerationEnabled ?? true}
          loading={isSavingSettings || siteSettingsQuery.isFetching}
          manualCopy="新的榜单条目会先进入待审核队列。"
          onDisable={() => {
            void updateModeration(false);
          }}
          onEnable={() => {
            void updateModeration(true);
          }}
          pendingCount={(itemsQuery.data?.items ?? []).filter((item) => item.status === "pending").length}
          title="榜单条目审核"
        />
      </AdminPanel>

      <AdminPanel title="条目列表">
        <Table
          bordered
          columns={[
            {
              key: "item",
              render: (_, record: RankingItemRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">
                    {record.rankingTitle} 路 #{record.rank}
                  </div>
                </div>
              ),
              title: "榜单条目"
            },
            {
              key: "owner",
              render: (_, record: RankingItemRecord) =>
                record.rankingAuthorName,
              title: "所属榜单作者",
              width: 160
            },
            {
              key: "meta",
              render: (_, record: RankingItemRecord) => (
                <span>{record.brandName ?? record.linkedModel?.brand.name ?? "未填品牌"}</span>
              ),
              title: "品牌",
              width: 160
            },
            {
              key: "status",
              render: (_, record: RankingItemRecord) => {
                const meta = itemStatusLabel(record.status);
                return <Tag color={meta.color}>{meta.text}</Tag>;
              },
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: RankingItemRecord) => (
                <Space size="small" wrap>
                  <Button href={`/admin/rankings/${record.rankingId}`} size="small" type="link">
                    查看所属榜单
                  </Button>
                </Space>
              ),
              title: "操作",
              width: 160
            }
          ]}
          dataSource={itemsQuery.data?.items ?? []}
          locale={{ emptyText: <Empty description="当前筛选下没有榜单条目" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={itemsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
