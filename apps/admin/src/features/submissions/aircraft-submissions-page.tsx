import { useQuery } from "@tanstack/react-query";
import { Button, Space, Table } from "antd";
import { useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

type SubmissionRecord = Awaited<ReturnType<typeof apiClient.listAdminAircraftSubmissions>>["items"][number];

export function AircraftSubmissionsPage() {
  const [error, setError] = useState<string | null>(null);
  const submissionsQuery = useQuery({
    queryKey: ["admin-aircraft-submissions"],
    queryFn: () => apiClient.listAdminAircraftSubmissions()
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

  return (
    <AdminPage
      description="集中处理用户提交的飞行器资料。前期仍保留人工审核，避免机型库被脏数据冲击。"
      title="飞行器投稿审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

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
