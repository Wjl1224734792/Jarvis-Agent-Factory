import { useQuery } from "@tanstack/react-query";
import { Button, Select, Space, Table } from "antd";
import { useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已发布", value: "published" },
  { label: "已驳回", value: "rejected" },
  { label: "已隐藏", value: "hidden" }
] as const;

type PostStatusFilter = (typeof statusOptions)[number]["value"];
type PostRecord = Awaited<ReturnType<typeof apiClient.listAdminPosts>>["items"][number];

export function PostsPage() {
  const [status, setStatus] = useState<PostStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: ["admin-posts", status],
    queryFn: () => apiClient.listAdminPosts(status === "all" ? undefined : status)
  });

  function updateStatus(id: string, nextStatus: "published" | "rejected" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostStatus(id, {
        status: nextStatus
      })
      .then(() => {
        void postsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新帖子状态失败");
      });
  }

  return (
    <AdminPage
      actions={
        <Select
          onChange={(value) => {
            setStatus(value);
          }}
          options={statusOptions as unknown as Array<{ label: string; value: string }>}
          style={{ width: 180 }}
          value={status}
        />
      }
      description="按状态审核帖子，控制发布、驳回和隐藏。"
      title="帖子审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <AdminPanel title="帖子列表">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: PostRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">
                    {record.author.displayName} · 评论 {record.commentCount} · 举报 {record.reportCount}
                  </div>
                </div>
              ),
              title: "帖子"
            },
            {
              dataIndex: "contentPreview",
              key: "contentPreview",
              title: "摘要"
            },
            {
              dataIndex: "status",
              key: "status",
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: PostRecord) => (
                <Space size="small" wrap>
                  {record.status !== "published" ? (
                    <Button
                      onClick={() => updateStatus(record.id, "published")}
                      size="small"
                      type="primary"
                    >
                      通过
                    </Button>
                  ) : null}
                  {record.status !== "rejected" ? (
                    <Button
                      onClick={() => updateStatus(record.id, "rejected")}
                      size="small"
                    >
                      驳回
                    </Button>
                  ) : null}
                  {record.status !== "hidden" ? (
                    <Button
                      danger
                      onClick={() => updateStatus(record.id, "hidden")}
                      size="small"
                    >
                      隐藏
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 240
            }
          ]}
          dataSource={postsQuery.data?.items ?? []}
          loading={postsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
