import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Space, Table, Tag } from "antd";
import { useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

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
  const applicationsQuery = useQuery({
    queryKey: ["admin-brand-applications"],
    queryFn: () => apiClient.listAdminBrandApplications()
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

  return (
    <AdminPage
      description="品牌申请从机型投稿里拆分出来，单独进入这里审核和沉淀到品牌库。"
      title="品牌申请审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <AdminPanel title="申请列表">
        <Table
          bordered
          columns={[
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
              render: (value: string | null) => value ?? "申请人未补充描述",
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
          locale={{ emptyText: <Empty description="暂时还没有品牌申请" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={applicationsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
