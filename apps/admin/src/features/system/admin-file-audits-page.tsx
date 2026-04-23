import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Input,
  Select,
  Space,
  Table,
  Tag
} from "antd";
import { useMemo, useState } from "react";
import { AdminPage } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";

type FileAuditRecord = Awaited<ReturnType<typeof apiClient.listAdminAuditRecords>>["items"][number];

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Queued", value: "queued" },
  { label: "Running", value: "running" },
  { label: "Passed", value: "passed" },
  { label: "Rejected", value: "rejected" },
  { label: "Needs Manual", value: "needs_manual_review" },
  { label: "Failed", value: "failed" },
  { label: "Manual Passed", value: "manual_passed" },
  { label: "Manual Rejected", value: "manual_rejected" }
] as const;

type FileAuditStatusFilter = (typeof statusOptions)[number]["value"];

function statusColor(status: FileAuditRecord["status"]) {
  switch (status) {
    case "passed":
    case "manual_passed":
      return "green";
    case "rejected":
    case "manual_rejected":
      return "red";
    case "needs_manual_review":
      return "gold";
    case "failed":
      return "volcano";
    case "running":
      return "processing";
    default:
      return "default";
  }
}

export function AdminFileAuditsPage() {
  const [status, setStatus] = useState<FileAuditStatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const auditsQuery = useQuery({
    queryKey: ["admin-file-audits"],
    queryFn: () => apiClient.listAdminAuditRecords({ domain: "file", limit: 100 })
  });

  const items = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return (auditsQuery.data?.items ?? []).filter((item) => {
      if (status !== "all" && item.status !== status) {
        return false;
      }
      if (!keyword) {
        return true;
      }

      return [item.entityId, item.id, item.scene ?? "", item.errorMessage ?? ""]
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [auditsQuery.data?.items, searchText, status]);

  async function applyManualDecision(
    id: string,
    nextStatus: "manual_passed" | "manual_rejected",
    reviewNote?: string | null
  ) {
    setError(null);
    try {
      await apiClient.updateAdminAuditManualReview(id, {
        status: nextStatus,
        reviewNote: reviewNote ?? null
      });
      await auditsQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Failed to update audit status.");
    }
  }

  return (
    <AdminPage
      title="File Audit Review"
      description="Review file-domain audit records and manually mark media as passed or rejected."
      actions={
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="Search by file id / audit id / scene"
            style={{ width: 280 }}
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
            }}
          />
          <Select
            options={statusOptions as unknown as Array<{ label: string; value: string }>}
            style={{ width: 180 }}
            value={status}
            onChange={(value) => {
              setStatus(value);
            }}
          />
        </Space>
      }
    >
      {error ? <Alert message={error} showIcon type="error" /> : null}

      <Table
        bordered
        columns={[
          {
            dataIndex: "entityId",
            key: "entityId",
            title: "File ID",
            width: 220
          },
          {
            dataIndex: "status",
            key: "status",
            title: "Status",
            width: 150,
            render: (value: FileAuditRecord["status"]) => (
              <Tag color={statusColor(value)}>{value}</Tag>
            )
          },
          {
            dataIndex: "scene",
            key: "scene",
            title: "Scene",
            width: 180,
            render: (value: string | null) => value ?? "-"
          },
          {
            dataIndex: "reviewedBy",
            key: "reviewedBy",
            title: "Reviewed By",
            width: 160,
            render: (value: string | null) => value ?? "-"
          },
          {
            dataIndex: "reviewNote",
            key: "reviewNote",
            title: "Review Note",
            render: (value: string | null) => value ?? "-"
          },
          {
            dataIndex: "updatedAt",
            key: "updatedAt",
            title: "Updated At",
            width: 180
          },
          {
            key: "actions",
            title: "Actions",
            width: 220,
            render: (_, record: FileAuditRecord) => (
              <Space size="small" wrap>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    void applyManualDecision(record.id, "manual_passed");
                  }}
                >
                  Manual Pass
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    const reviewNote = promptRejectionReason();
                    if (!reviewNote) {
                      return;
                    }
                    void applyManualDecision(record.id, "manual_rejected", reviewNote);
                  }}
                >
                  Manual Reject
                </Button>
              </Space>
            )
          }
        ]}
        dataSource={items}
        loading={auditsQuery.isLoading || auditsQuery.isFetching}
        pagination={false}
        rowKey={(record) => record.id}
        size="small"
      />
    </AdminPage>
  );
}
