import { useQuery } from "@tanstack/react-query";
import { Button, Select, Table } from "antd";
import { useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";

const statusOptions = [
  { label: "全部", value: "all" },
  { label: "可见", value: "visible" },
  { label: "已隐藏", value: "hidden" }
] as const;

type CommentStatusFilter = (typeof statusOptions)[number]["value"];
type CommentRecord = Awaited<ReturnType<typeof apiClient.listAdminPostComments>>["items"][number];

export function PostCommentsPage() {
  const [status, setStatus] = useState<CommentStatusFilter>("all");
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["admin-post-comments", status],
    queryFn: () => apiClient.listAdminPostComments(status === "all" ? undefined : status)
  });

  function updateStatus(id: string, nextStatus: "visible" | "hidden") {
    setError(null);
    void apiClient
      .updateAdminPostCommentStatus(id, {
        status: nextStatus
      })
      .then(() => {
        void commentsQuery.refetch();
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "更新评论状态失败");
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
      description="管理帖子评论和回复的可见状态。"
      title="评论审核"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}

      <AdminPanel title="评论列表">
        <Table
          bordered
          columns={[
            {
              key: "postTitle",
              render: (_, record: CommentRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.postTitle}</div>
                  <div className="admin-table-subtitle">
                    {record.author.displayName} · {record.parentCommentId ? "回复" : "主评论"}
                  </div>
                </div>
              ),
              title: "评论对象"
            },
            {
              dataIndex: "content",
              key: "content",
              title: "内容"
            },
            {
              dataIndex: "status",
              key: "status",
              title: "状态",
              width: 120
            },
            {
              key: "action",
              render: (_, record: CommentRecord) => (
                <Button
                  onClick={() => {
                    updateStatus(record.id, record.status === "visible" ? "hidden" : "visible");
                  }}
                  size="small"
                  type={record.status === "visible" ? "default" : "primary"}
                >
                  {record.status === "visible" ? "隐藏" : "恢复显示"}
                </Button>
              ),
              title: "操作",
              width: 120
            }
          ]}
          dataSource={commentsQuery.data?.items ?? []}
          loading={commentsQuery.isLoading}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
