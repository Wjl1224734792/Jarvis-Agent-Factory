import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Empty, Segmented, Space, Table, Tag } from "antd";
import { APP_ROUTES } from "@feijia/shared";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  formatCommunityRankingStatus,
  partitionRankingRecords,
  type AdminRankingStatus
} from "./rankings-admin-helpers";

type RankingRecord = Awaited<ReturnType<typeof apiClient.listOfficialRankings>>["items"][number];

const communityStatusOptions: Array<{ label: string; value: AdminRankingStatus }> = [
  { label: "待审核", value: "pending" },
  { label: "已发布", value: "published" },
  { label: "已驳回", value: "rejected" },
  { label: "已隐藏", value: "hidden" }
];

function RankingScopeTag(props: { type: RankingRecord["type"] }) {
  return (
    <Tag color={props.type === "official" ? "cyan" : "gold"}>
      {props.type === "official" ? "官方" : "社区"}
    </Tag>
  );
}

export function RankingsPage() {
  const queryClient = useQueryClient();
  const [communityFilter, setCommunityFilter] = useState<AdminRankingStatus>("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);

  const siteSettingsQuery = useQuery({
    queryKey: ["admin-ranking-site-settings"],
    queryFn: () => apiClient.getSiteSettings()
  });
  const officialRankingsQuery = useQuery({
    queryKey: ["admin-rankings", "official"],
    queryFn: () => apiClient.listOfficialRankings()
  });
  const communityRankingsQuery = useQuery({
    queryKey: ["admin-rankings", "community", communityFilter],
    queryFn: () => apiClient.listCommunityRankingsForModeration(communityFilter)
  });

  const officialItems = useMemo(
    () => partitionRankingRecords(officialRankingsQuery.data?.items ?? []).official,
    [officialRankingsQuery.data?.items]
  );
  const communityItems = communityRankingsQuery.data?.items ?? [];

  async function updateModerationSetting(enabled: boolean) {
    const current = siteSettingsQuery.data?.item;
    if (!current) {
      return;
    }

    setIsUpdatingSetting(true);
    setActionError(null);
    try {
      await apiClient.updateSiteSettings({
        ...current,
        rankingModerationEnabled: enabled
      });
      await siteSettingsQuery.refetch();
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "更新榜单审核开关失败");
    } finally {
      setIsUpdatingSetting(false);
    }
  }

  async function updateRankingStatus(id: string, status: "published" | "rejected" | "hidden") {
    setActionError(null);
    try {
      await apiClient.updateRankingStatus(id, { status });
      await Promise.all([officialRankingsQuery.refetch(), communityRankingsQuery.refetch()]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "更新榜单状态失败");
    }
  }

  return (
    <AdminPage
      actions={
        <Button href={`${APP_ROUTES.adminRankings}/new`} type="primary">
          新建官方榜单
        </Button>
      }
      description="区分官方榜单工作台与社区榜单审核队列。"
      title="榜单管理"
    >
      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <div className="admin-field-stack">
        <AdminPanel
          description="管理员维护的官方榜单在这里编辑、预览和更新。"
          title="官方榜单管理"
        >
          <Table
            bordered
            columns={[
              {
                key: "title",
                render: (_, record: RankingRecord) => (
                  <div className="admin-table-meta">
                    <div className="admin-row-actions">
                      <div className="admin-table-title">{record.title}</div>
                      <RankingScopeTag type={record.type} />
                    </div>
                    <div className="admin-table-subtitle">{record.description}</div>
                  </div>
                ),
                title: "榜单"
              },
              {
                dataIndex: "itemAddPolicy",
                key: "itemAddPolicy",
                render: (value: RankingRecord["itemAddPolicy"]) =>
                  value === "public" ? "开放访客添加" : "仅创建者添加",
                title: "权限",
                width: 160
              },
              {
                dataIndex: "itemCount",
                key: "itemCount",
                title: "条目数",
                width: 100
              },
              {
                key: "action",
                render: (_, record: RankingRecord) => (
                  <Button href={`${APP_ROUTES.adminRankings}/${record.id}`} size="small" type="link">
                    编辑
                  </Button>
                ),
                title: "操作",
                width: 100
              }
            ]}
            dataSource={officialItems}
            locale={{ emptyText: <Empty description="暂无官方榜单" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            loading={officialRankingsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>

        <AdminPanel
          actions={
            <Space wrap>
              <Segmented
                disabled={isUpdatingSetting}
                onChange={(value) => {
                  void updateModerationSetting(Boolean(value));
                }}
                options={[
                  { label: "人工审核", value: true },
                  { label: "自动发布", value: false }
                ]}
                value={siteSettingsQuery.data?.item.rankingModerationEnabled ?? true}
              />
              <Segmented
                onChange={(value) => {
                  setCommunityFilter(value as AdminRankingStatus);
                }}
                options={communityStatusOptions}
                value={communityFilter}
              />
            </Space>
          }
          description="社区榜单进入待审核、发布、驳回、隐藏链路。"
          title="社区榜单审核"
        >
          <Table
            bordered
            columns={[
              {
                key: "title",
                render: (_, record: RankingRecord) => (
                  <div className="admin-table-meta">
                    <div className="admin-table-title">{record.title}</div>
                    <div className="admin-table-subtitle">{record.description}</div>
                  </div>
                ),
                title: "榜单"
              },
              {
                key: "author",
                render: (_, record: RankingRecord) => record.author.displayName,
                title: "作者",
                width: 140
              },
              {
                dataIndex: "itemAddPolicy",
                key: "itemAddPolicy",
                render: (value: RankingRecord["itemAddPolicy"]) =>
                  value === "public" ? "开放访客添加" : "仅创建者添加",
                title: "权限",
                width: 160
              },
              {
                key: "status",
                render: (_, record: RankingRecord) => (
                  <Tag color={record.status === "published" ? "green" : record.status === "pending" ? "gold" : record.status === "hidden" ? "default" : "red"}>
                    {formatCommunityRankingStatus(record.status)}
                  </Tag>
                ),
                title: "状态",
                width: 120
              },
              {
                key: "action",
                render: (_, record: RankingRecord) => (
                  <Space size="small" wrap>
                    {record.status !== "published" ? (
                      <Button
                        onClick={() => {
                          void updateRankingStatus(record.id, "published");
                        }}
                        size="small"
                        type="link"
                      >
                        发布
                      </Button>
                    ) : null}
                    {record.status !== "rejected" ? (
                      <Button
                        danger
                        onClick={() => {
                          void updateRankingStatus(record.id, "rejected");
                        }}
                        size="small"
                        type="link"
                      >
                        驳回
                      </Button>
                    ) : null}
                    {record.status === "published" ? (
                      <Button
                        onClick={() => {
                          void updateRankingStatus(record.id, "hidden");
                        }}
                        size="small"
                        type="link"
                      >
                        隐藏
                      </Button>
                    ) : null}
                  </Space>
                ),
                title: "操作",
                width: 180
              }
            ]}
            dataSource={communityItems}
            locale={{ emptyText: <Empty description="当前筛选下没有社区榜单" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            loading={communityRankingsQuery.isLoading || siteSettingsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
