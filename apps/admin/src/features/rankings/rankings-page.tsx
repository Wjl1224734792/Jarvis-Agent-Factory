import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Input, Modal, Segmented, Space, Table, Tag } from "antd";
import { APP_ROUTES } from "@feijia/shared";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { promptRejectionReason } from "../../lib/moderation-actions";
import { buildSiteSettingsUpdate } from "../../lib/site-settings";
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
  const [communityFilter, setCommunityFilter] = useState<AdminRankingStatus>("pending");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

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
  const detailQuery = useQuery({
    queryKey: ["admin-ranking-detail-modal", detailId],
    queryFn: () => apiClient.getRankingDetail(detailId!),
    enabled: Boolean(detailId)
  });

  const officialItems = useMemo(
    () => partitionRankingRecords(officialRankingsQuery.data?.items ?? []).official,
    [officialRankingsQuery.data?.items]
  );
  const communityItems = communityRankingsQuery.data?.items ?? [];
  const filteredOfficialItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return officialItems;
    }

    return officialItems.filter((item) =>
      [item.title, item.description, item.author.displayName]
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [officialItems, searchText]);
  const filteredCommunityItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return communityItems;
    }

    return communityItems.filter((item) =>
      [item.title, item.description, item.author.displayName]
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [communityItems, searchText]);

  async function updateModerationSetting(enabled: boolean) {
    const current = siteSettingsQuery.data?.item;
    if (!current) {
      return;
    }

    setIsUpdatingSetting(true);
    setActionError(null);
    try {
      await apiClient.updateSiteSettings(
        buildSiteSettingsUpdate(current, {
          rankingModerationEnabled: enabled
        })
      );
      await siteSettingsQuery.refetch();
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "更新榜单审核开关失败");
    } finally {
      setIsUpdatingSetting(false);
    }
  }

  async function updateRankingStatus(
    id: string,
    status: "published" | "rejected" | "hidden",
    rejectionReason?: string | null
  ) {
    setActionError(null);
    try {
      await apiClient.updateRankingStatus(id, {
        status,
        rejectionReason: status === "rejected" ? rejectionReason ?? null : null
      });
      await Promise.all([officialRankingsQuery.refetch(), communityRankingsQuery.refetch()]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "更新榜单状态失败");
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
            placeholder="搜索榜单标题、作者或简介"
            style={{ width: 280 }}
            value={searchText}
          />
          <Button href={ADMIN_ROUTE_PATHS.moderationRatingTargets}>查看条目审核</Button>
          <Button href={`${APP_ROUTES.adminRankings}/new`} type="primary">
            新建官方榜单
          </Button>
        </Space>
      }
      description="这里只处理榜单本体的创建、发布和状态流转，榜单条目已拆到独立审核页。"
      title="榜单审核"
    >
      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <div className="admin-field-stack">
        <AdminPanel description="管理员维护的官方榜单在这里编辑、预览和更新。" title="官方榜单管理">
          <Table
            bordered
            columns={[
              {
                key: "cover",
                render: (_, record: RankingRecord) =>
                  record.coverImageUrl ? (
                    <Image alt={record.title} height={64} preview={false} src={record.coverImageUrl} width={96} />
                  ) : (
                    <div className="admin-cover-thumb admin-cover-thumb--empty">无封面</div>
                  ),
                title: "封面",
                width: 120
              },
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
                    <Button href={`${APP_ROUTES.adminRankings}/${record.id}`} size="small" type="link">
                      编辑
                    </Button>
                  </Space>
                ),
                title: "操作",
                width: 140
              }
            ]}
            dataSource={filteredOfficialItems}
            locale={{
              emptyText: <Empty description="暂无官方榜单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }}
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
                  { label: "自动通过", value: false }
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
                key: "cover",
                render: (_, record: RankingRecord) =>
                  record.coverImageUrl ? (
                    <Image alt={record.title} height={64} preview={false} src={record.coverImageUrl} width={96} />
                  ) : (
                    <div className="admin-cover-thumb admin-cover-thumb--empty">无封面</div>
                  ),
                title: "封面",
                width: 120
              },
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
                  <Tag
                    color={
                      record.status === "published"
                        ? "green"
                        : record.status === "pending"
                          ? "gold"
                          : record.status === "hidden"
                            ? "default"
                            : "red"
                    }
                  >
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
                    <Button
                      onClick={() => {
                        setDetailId(record.id);
                      }}
                      size="small"
                      type="link"
                    >
                      详情
                    </Button>
                    {record.status !== "published" ? (
                      <Button
                        onClick={() => {
                          void updateRankingStatus(record.id, "published");
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
                          void updateRankingStatus(record.id, "rejected", reason);
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
                        下架
                      </Button>
                    ) : null}
                  </Space>
                ),
                title: "操作",
                width: 180
              }
            ]}
            dataSource={filteredCommunityItems}
            locale={{
              emptyText: <Empty description="当前筛选下没有社区榜单" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            }}
            loading={communityRankingsQuery.isLoading || siteSettingsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>
      </div>

      <Modal
        footer={null}
        onCancel={() => setDetailId(null)}
        open={Boolean(detailId)}
        title="榜单详情"
        width={900}
      >
        {detailQuery.data?.item ? (
          <div className="admin-detail-sheet">
            {detailQuery.data.item.coverImageUrl ? (
              <Image
                alt={detailQuery.data.item.title}
                className="admin-detail-sheet__cover"
                preview={false}
                src={detailQuery.data.item.coverImageUrl}
              />
            ) : (
              <div className="admin-detail-sheet__cover admin-detail-sheet__cover--empty">暂无封面</div>
            )}
            <div className="admin-detail-sheet__meta">
              <Tag>{detailQuery.data.item.type === "official" ? "官方榜单" : "社区榜单"}</Tag>
              <Tag>{formatCommunityRankingStatus(detailQuery.data.item.status)}</Tag>
              <span>{detailQuery.data.item.author.displayName}</span>
            </div>
            <h3 className="admin-detail-sheet__title">{detailQuery.data.item.title}</h3>
            <div className="admin-detail-sheet__body">
              <p>{detailQuery.data.item.description}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
