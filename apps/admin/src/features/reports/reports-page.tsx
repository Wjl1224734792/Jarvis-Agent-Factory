import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Input, Modal, Space, Table, Tag } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { promptRejectionReason } from "../../lib/moderation-actions";

type DetailState = {
  kind:
    | "post"
    | "model"
    | "review"
    | "rating-target"
    | "post-comment"
    | "review-comment"
    | "model-comment"
    | "ranking-comment"
    | "rating-target-comment";
  id: string;
  title: string;
  subtitle?: string | null;
  preview?: string | null;
};

type ReportSummaryItem = Awaited<
  ReturnType<typeof apiClient.listAdminReportsSummary>
>["items"][number];

type CommentReportKind =
  | "post-comment"
  | "review-comment"
  | "model-comment"
  | "ranking-comment"
  | "rating-target-comment";

function isCommentReportKind(kind: ReportSummaryItem["kind"]): kind is CommentReportKind {
  return [
    "post-comment",
    "review-comment",
    "model-comment",
    "ranking-comment",
    "rating-target-comment"
  ].includes(kind);
}

async function toggleCommentVisibility(item: ReportSummaryItem) {
  const nextStatus = item.status === "visible" ? "hidden" : "visible";

  switch (item.kind) {
    case "post-comment":
      return apiClient.updateAdminPostCommentStatus(item.id, { status: nextStatus });
    case "review-comment":
      return apiClient.updateAdminReviewCommentStatus(item.id, { status: nextStatus });
    case "model-comment":
      return apiClient.updateAdminModelCommentStatus(item.id, { status: nextStatus });
    case "ranking-comment":
      return apiClient.updateAdminRankingCommentStatus(item.id, { status: nextStatus });
    case "rating-target-comment":
      return apiClient.updateAdminRatingTargetCommentStatus(item.id, { status: nextStatus });
  }
}

export function ReportsPage() {
  const [searchText, setSearchText] = useState("");
  const [detail, setDetail] = useState<DetailState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["admin-report-summary"],
    queryFn: () => apiClient.listAdminReportsSummary()
  });
  const detailQuery = useQuery({
    queryKey: ["admin-report-detail", detail?.kind, detail?.id],
    queryFn: () => {
      if (!detail) {
        throw new Error("Missing report detail target.");
      }
      return apiClient.getAdminReportDetails(detail.kind, detail.id);
    },
    enabled: Boolean(detail)
  });

  const keyword = searchText.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const items = summaryQuery.data?.items ?? [];
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.subtitle, item.preview].some((value) =>
        String(value ?? "").toLowerCase().includes(keyword)
      )
    );
  }, [keyword, summaryQuery.data?.items]);

  const reportedPosts = useMemo(
    () => filteredItems.filter((item) => item.kind === "post"),
    [filteredItems]
  );
  const moderationRows = useMemo(
    () => filteredItems.filter((item) => item.kind !== "post"),
    [filteredItems]
  );

  async function refreshAll() {
    await Promise.all([summaryQuery.refetch(), detailQuery.refetch()]);
  }

  return (
    <AdminPage
      actions={
        <Input.Search
          allowClear
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          placeholder="搜索被举报的标题、作者、摘要或评论"
          style={{ width: 320 }}
          value={searchText}
        />
      }
      description="集中查看被举报内容，并在详情里直接核对举报理由和证据图。"
      title="举报内容审核"
    >
      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <AdminPanel title="被举报文章 / 动态">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: (typeof reportedPosts)[number]) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">{record.subtitle}</div>
                </div>
              ),
              title: "内容"
            },
            {
              key: "reports",
              render: (_, record: (typeof reportedPosts)[number]) => (
                <Tag color="red">举报 {record.reportCount}</Tag>
              ),
              title: "举报",
              width: 110
            },
            {
              key: "action",
              render: (_, record: (typeof reportedPosts)[number]) => (
                <Space size="small">
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      setDetail({
                        kind: "post",
                        id: record.id,
                        title: record.title,
                        subtitle: record.subtitle,
                        preview: record.preview
                      })
                    }
                  >
                    详情
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      const reason = promptRejectionReason("请输入内容驳回返修原因");
                      if (!reason) {
                        return;
                      }
                      setActionError(null);
                      void apiClient
                        .updateAdminPostStatus(record.id, {
                          status: "rejected",
                          rejectionReason: reason
                        })
                        .then(() => refreshAll())
                        .catch((reasonValue: unknown) =>
                          setActionError(
                            reasonValue instanceof Error ? reasonValue.message : "处理失败"
                          )
                        );
                    }}
                  >
                    驳回返修
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setActionError(null);
                      void apiClient
                        .updateAdminPostStatus(record.id, { status: "hidden" })
                        .then(() => refreshAll())
                        .catch((reasonValue: unknown) =>
                          setActionError(
                            reasonValue instanceof Error ? reasonValue.message : "处理失败"
                          )
                        );
                    }}
                  >
                    下线隐藏
                  </Button>
                </Space>
              ),
              title: "操作",
              width: 220
            }
          ]}
          dataSource={reportedPosts}
          locale={{
            emptyText: (
              <Empty description="暂无被举报文章或动态" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )
          }}
          loading={summaryQuery.isLoading}
          rowKey={(record) => `${record.kind}-${record.id}`}
          size="middle"
        />
      </AdminPanel>

      <AdminPanel title="被举报评测 / 机型 / 条目 / 评论">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: (typeof moderationRows)[number]) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">{record.subtitle ?? null}</div>
                </div>
              ),
              title: "对象"
            },
            {
              key: "reports",
              render: (_, record: (typeof moderationRows)[number]) => (
                <Tag color="red">举报 {record.reportCount}</Tag>
              ),
              title: "举报",
              width: 110
            },
            {
              key: "action",
              render: (_, record: (typeof moderationRows)[number]) => (
                <Space size="small">
                  <Button
                    size="small"
                    type="link"
                    onClick={() =>
                      setDetail({
                        kind: record.kind,
                        id: record.id,
                        title: record.title,
                        subtitle: record.subtitle,
                        preview: record.preview
                      })
                    }
                  >
                    详情
                  </Button>
                  {isCommentReportKind(record.kind) ? (
                    <Button
                      size="small"
                      type="link"
                      onClick={() => {
                        setActionError(null);
                        void toggleCommentVisibility(record)
                          .then(() => refreshAll())
                          .catch((reasonValue: unknown) =>
                            setActionError(
                              reasonValue instanceof Error ? reasonValue.message : "处理失败"
                            )
                          );
                      }}
                    >
                      {record.status === "visible" ? "隐藏" : "恢复显示"}
                    </Button>
                  ) : null}
                </Space>
              ),
              title: "操作",
              width: 180
            }
          ]}
          dataSource={moderationRows}
          locale={{ emptyText: <Empty description="暂无被举报内容" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          loading={summaryQuery.isLoading}
          rowKey={(record) => `${record.kind}-${record.id}`}
          size="middle"
        />
      </AdminPanel>

      <Modal footer={null} onCancel={() => setDetail(null)} open={Boolean(detail)} title="举报详情" width={820}>
        {detail ? (
          <div className="admin-detail-sheet">
            <div className="admin-detail-sheet__cover admin-detail-sheet__cover--empty">举报证据</div>
            <div className="admin-detail-sheet__meta">
              <Tag>{detail.kind}</Tag>
              {detail.subtitle ? <span>{detail.subtitle}</span> : null}
            </div>
            <h3 className="admin-detail-sheet__title">{detail.title}</h3>
            {detail.preview ? (
              <div className="admin-detail-sheet__body">
                <p>{detail.preview}</p>
              </div>
            ) : null}
            {detailQuery.isLoading ? (
              <div className="admin-detail-sheet__body">
                <p>加载举报明细中...</p>
              </div>
            ) : null}
            {detailQuery.data?.items?.length ? (
              <div className="admin-field-stack">
                {detailQuery.data.items.map((report) => (
                  <div className="admin-panel" key={report.id}>
                    <div className="admin-panel__body">
                      <div className="admin-table-meta">
                        <div className="admin-table-title">{report.reporter.displayName}</div>
                        <div className="admin-table-subtitle">
                          {new Date(report.createdAt).toLocaleString("zh-CN", { hour12: false })}
                        </div>
                      </div>
                      <p>{report.reason}</p>
                      {report.evidenceImages.length ? (
                        <div className="admin-image-grid">
                          {report.evidenceImages.map((image) => (
                            <Image
                              key={image.id}
                              alt={image.fileName ?? "report evidence"}
                              height={96}
                              src={image.url}
                              width={144}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : detailQuery.data ? (
              <Empty description="暂无举报明细" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
