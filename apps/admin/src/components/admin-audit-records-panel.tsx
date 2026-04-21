import { Space, Table, Tag, Typography } from "antd";
import { AdminPanel } from "./admin-ui";

type AdminAuditRecordSummary = {
  id: string;
  status: string;
  suggestion: string | null;
  scene: string | null;
  detailLabels?: string[];
  sceneSuggestions?: Record<string, string>;
  errorMessage: string | null;
  callbackReceivedAt?: string | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
  updatedAt: string;
};

export function AdminAuditRecordsPanel(props: {
  description: string;
  records: AdminAuditRecordSummary[] | undefined;
  loading?: boolean;
  emptyText: string;
  hint?: string | null;
}) {
  const shouldRenderTable = Boolean(props.loading || props.records?.length);

  return (
    <AdminPanel description={props.description} title="审核追踪">
      {shouldRenderTable ? (
        <Table
          bordered
          columns={[
            {
              dataIndex: "status",
              key: "status",
              title: "状态",
              width: 160
            },
            {
              dataIndex: "suggestion",
              key: "suggestion",
              render: (value: string | null) => value ?? "—",
              title: "建议",
              width: 120
            },
            {
              dataIndex: "scene",
              key: "scene",
              render: (value: string | null) => value ?? "—",
              title: "场景",
              width: 140
            },
            {
              dataIndex: "sceneSuggestions",
              key: "sceneSuggestions",
              render: (value: Record<string, string> | undefined) => {
                const entries = Object.entries(value ?? {});
                if (entries.length === 0) {
                  return "—";
                }

                return (
                  <Space size={[4, 4]} wrap>
                    {entries.map(([scene, suggestion]) => (
                      <Tag key={`${scene}-${suggestion}`}>{`${scene}: ${suggestion}`}</Tag>
                    ))}
                  </Space>
                );
              },
              title: "Scene建议",
              width: 220
            },
            {
              dataIndex: "detailLabels",
              key: "detailLabels",
              render: (value: string[] | undefined) =>
                value && value.length > 0 ? (
                  <Space size={[4, 4]} wrap>
                    {value.map((label) => (
                      <Tag key={label}>{label}</Tag>
                    ))}
                  </Space>
                ) : (
                  "—"
                ),
              title: "Detail标签",
              width: 220
            },
            {
              dataIndex: "errorMessage",
              key: "errorMessage",
              render: (value: string | null) => value ?? "—",
              title: "错误信息"
            },
            {
              dataIndex: "callbackReceivedAt",
              key: "callbackReceivedAt",
              render: (value: string | null | undefined) => value ?? "—",
              title: "回调时间",
              width: 180
            },
            {
              key: "manualReview",
              render: (_, record: AdminAuditRecordSummary) =>
                record.reviewedBy || record.reviewNote ? (
                  <Space direction="vertical" size={0}>
                    <Typography.Text>{record.reviewedBy ?? "人工复核"}</Typography.Text>
                    <Typography.Text type="secondary">
                      {record.reviewNote ?? "已人工处理，未填写备注。"}
                    </Typography.Text>
                  </Space>
                ) : (
                  "—"
                ),
              title: "人工复核",
              width: 220
            },
            {
              dataIndex: "updatedAt",
              key: "updatedAt",
              title: "更新时间",
              width: 180
            }
          ]}
          dataSource={(props.records ?? []).map((item) => ({ ...item, key: item.id }))}
          locale={{ emptyText: props.emptyText }}
          loading={props.loading}
          pagination={false}
          rowKey="id"
          size="small"
        />
      ) : (
        <div className="admin-table-empty">{props.emptyText}</div>
      )}
      {props.hint ? <div className="admin-moderation-card__hint">{props.hint}</div> : null}
    </AdminPanel>
  );
}
