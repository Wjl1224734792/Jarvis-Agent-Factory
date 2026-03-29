import { useQuery } from "@tanstack/react-query";
import { Button, Table } from "antd";
import { APP_ROUTES } from "@feijia/shared";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type RankingRecord = Awaited<ReturnType<typeof apiClient.listOfficialRankings>>["items"][number];

export function RankingsPage() {
  const rankingsQuery = useQuery({
    queryKey: ["admin-rankings"],
    queryFn: () => apiClient.listOfficialRankings()
  });

  return (
    <AdminPage
      actions={
        <Button href={`${APP_ROUTES.adminRankings}/new`} type="primary">
          新建官方榜单
        </Button>
      }
      description="维护官方榜单与排序条目。"
      title="官方榜单"
    >
      <AdminPanel title="榜单列表">
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
              dataIndex: "itemCount",
              key: "itemCount",
              title: "条目数",
              width: 100
            },
            {
              key: "averageScore",
              render: (_, record: RankingRecord) => record.averageScore.toFixed(1),
              title: "平均分",
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
          dataSource={rankingsQuery.data?.items ?? []}
          loading={rankingsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
