import { useQuery } from "@tanstack/react-query";
import { Button, Empty, Image, Input, Space, Table, Tag } from "antd";
import { useMemo, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { promptRejectionReason } from "../../lib/moderation-actions";

type ReportedPost = Awaited<ReturnType<typeof apiClient.listAdminPosts>>["items"][number];
type ReportedModel = Awaited<ReturnType<typeof apiClient.listModels>>["items"][number];
type ReportedReview = Awaited<ReturnType<typeof apiClient.listAdminReviews>>["items"][number];
type ReportedRanking = Awaited<ReturnType<typeof apiClient.listCommunityRankingsForModeration>>["items"][number];
type ReportedRankingItem = Awaited<
  ReturnType<typeof apiClient.listRankingItemsForModeration>
>["items"][number];
type ReportedPostComment = Awaited<ReturnType<typeof apiClient.listAdminPostComments>>["items"][number];
type ReportedReviewComment = Awaited<
  ReturnType<typeof apiClient.listAdminReviewComments>
>["items"][number];
type ReportedRankingComment = Awaited<
  ReturnType<typeof apiClient.listAdminRankingComments>
>["items"][number];
type ReportedRankingItemComment = Awaited<
  ReturnType<typeof apiClient.listAdminRankingItemComments>
>["items"][number];

type UnifiedCommentRecord = {
  id: string;
  sourceTitle: string;
  sourceSubtitle: string;
  content: string;
  authorName: string;
  reportCount: number;
  status: "pending" | "visible" | "hidden";
  domain: "post" | "review" | "ranking" | "ranking-item";
};

function includesKeyword(values: Array<string | null | undefined>, keyword: string) {
  if (!keyword) {
    return true;
  }

  return values.some((value) => String(value ?? "").toLowerCase().includes(keyword));
}

function postStatusLabel(status: ReportedPost["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "published":
      return { color: "green", text: "已发布" };
    case "rejected":
      return { color: "red", text: "已驳回" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

function reviewStatusLabel(status: ReportedReview["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "visible":
      return { color: "green", text: "已显示" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

function commentStatusLabel(status: UnifiedCommentRecord["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "visible":
      return { color: "green", text: "已显示" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

function rankingStatusLabel(status: ReportedRanking["status"]) {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "published":
      return { color: "green", text: "已发布" };
    case "rejected":
      return { color: "red", text: "已驳回" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

function rankingItemStatusLabel(status: ReportedRankingItem["status"] = "published") {
  switch (status) {
    case "pending":
      return { color: "gold", text: "待审核" };
    case "published":
      return { color: "green", text: "已发布" };
    case "rejected":
      return { color: "red", text: "已驳回" };
    case "hidden":
      return { color: "default", text: "已隐藏" };
  }
}

export function ReportsPage() {
  const [searchText, setSearchText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const postsQuery = useQuery({
    queryKey: ["admin-reports", "posts"],
    queryFn: () => apiClient.listAdminPosts()
  });
  const modelsQuery = useQuery({
    queryKey: ["admin-reports", "models"],
    queryFn: () => apiClient.listModels()
  });
  const reviewsQuery = useQuery({
    queryKey: ["admin-reports", "reviews"],
    queryFn: () => apiClient.listAdminReviews()
  });
  const rankingsQuery = useQuery({
    queryKey: ["admin-reports", "rankings"],
    queryFn: () => apiClient.listCommunityRankingsForModeration()
  });
  const rankingItemsQuery = useQuery({
    queryKey: ["admin-reports", "ranking-items"],
    queryFn: () => apiClient.listRankingItemsForModeration()
  });
  const postCommentsQuery = useQuery({
    queryKey: ["admin-reports", "post-comments"],
    queryFn: () => apiClient.listAdminPostComments()
  });
  const reviewCommentsQuery = useQuery({
    queryKey: ["admin-reports", "review-comments"],
    queryFn: () => apiClient.listAdminReviewComments()
  });
  const rankingCommentsQuery = useQuery({
    queryKey: ["admin-reports", "ranking-comments"],
    queryFn: () => apiClient.listAdminRankingComments()
  });
  const rankingItemCommentsQuery = useQuery({
    queryKey: ["admin-reports", "ranking-item-comments"],
    queryFn: () => apiClient.listAdminRankingItemComments()
  });

  const keyword = searchText.trim().toLowerCase();

  const reportedPosts = useMemo(
    () =>
      (postsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) =>
          includesKeyword([item.title, item.contentPreview, item.author.displayName], keyword)
        ),
    [keyword, postsQuery.data?.items]
  );

  const reportedModels = useMemo(
    () =>
      (modelsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword([item.name, item.brand.name, item.category.name], keyword)),
    [keyword, modelsQuery.data?.items]
  );

  const reportedReviews = useMemo(
    () =>
      (reviewsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword([item.model.name, item.author.displayName, item.content], keyword)),
    [keyword, reviewsQuery.data?.items]
  );

  const reportedRankings = useMemo(
    () =>
      (rankingsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) => includesKeyword([item.title, item.description, item.author.displayName], keyword)),
    [keyword, rankingsQuery.data?.items]
  );

  const reportedRankingItems = useMemo(
    () =>
      (rankingItemsQuery.data?.items ?? [])
        .filter((item) => (item.reportCount ?? 0) > 0)
        .filter((item) =>
          includesKeyword(
            [item.title, item.rankingTitle, item.rankingAuthorName, item.brandName ?? ""],
            keyword
          )
        ),
    [keyword, rankingItemsQuery.data?.items]
  );

  const reportedComments = useMemo<UnifiedCommentRecord[]>(() => {
    const postItems = (postCommentsQuery.data?.items ?? [])
      .filter((item: ReportedPostComment) => (item.reportCount ?? 0) > 0)
      .map((item: ReportedPostComment) => ({
        id: item.id,
        sourceTitle: item.postTitle,
        sourceSubtitle: item.parentCommentId ? "帖子回复" : "帖子主评论",
        content: item.content,
        authorName: item.author.displayName,
        reportCount: item.reportCount ?? 0,
        status: item.status,
        domain: "post" as const
      }));
    const reviewItems = (reviewCommentsQuery.data?.items ?? [])
      .filter((item: ReportedReviewComment) => (item.reportCount ?? 0) > 0)
      .map((item: ReportedReviewComment) => ({
        id: item.id,
        sourceTitle: item.model.name,
        sourceSubtitle: item.reviewTitle,
        content: item.content,
        authorName: item.author.displayName,
        reportCount: item.reportCount ?? 0,
        status: item.status,
        domain: "review" as const
      }));
    const rankingItems = (rankingCommentsQuery.data?.items ?? [])
      .filter((item: ReportedRankingComment) => (item.reportCount ?? 0) > 0)
      .map((item: ReportedRankingComment) => ({
        id: item.id,
        sourceTitle: item.rankingTitle,
        sourceSubtitle: "榜单评论",
        content: item.content,
        authorName: item.author.displayName,
        reportCount: item.reportCount ?? 0,
        status: item.status,
        domain: "ranking" as const
      }));
    const rankingEntryItems = (rankingItemCommentsQuery.data?.items ?? [])
      .filter((item: ReportedRankingItemComment) => (item.reportCount ?? 0) > 0)
      .map((item: ReportedRankingItemComment) => ({
        id: item.id,
        sourceTitle: item.rankingItemTitle,
        sourceSubtitle: item.rankingTitle,
        content: item.content,
        authorName: item.author.displayName,
        reportCount: item.reportCount ?? 0,
        status: item.status,
        domain: "ranking-item" as const
      }));

    return [...postItems, ...reviewItems, ...rankingItems, ...rankingEntryItems].filter((item) =>
      includesKeyword([item.sourceTitle, item.sourceSubtitle, item.content, item.authorName], keyword)
    );
  }, [
    keyword,
    postCommentsQuery.data?.items,
    reviewCommentsQuery.data?.items,
    rankingCommentsQuery.data?.items,
    rankingItemCommentsQuery.data?.items
  ]);

  async function hideModel(record: ReportedModel) {
    const detail = await apiClient.getModelDetail(record.slug);
    await apiClient.updateModel(detail.item.id, {
      slug: detail.item.slug,
      name: detail.item.name,
      categoryId: detail.item.category.id,
      brandId: detail.item.brand.id,
      powerType: detail.item.powerType,
      summary: detail.item.summary,
      description: detail.item.description,
      maxFlightTimeMinutes: detail.item.parameters.maxFlightTimeMinutes,
      maxRangeKilometers: detail.item.parameters.maxRangeKilometers,
      maxSpeedKph: detail.item.parameters.maxSpeedKph,
      takeoffWeightGrams: detail.item.parameters.takeoffWeightGrams,
      isPublished: false
    });
  }

  async function rejectModel(record: ReportedModel) {
    if (!record.sourceSubmissionId) {
      return;
    }
    const reason = promptRejectionReason("请输入机型驳回理由");
    if (!reason) {
      return;
    }
    await apiClient.updateAircraftSubmissionStatus(record.sourceSubmissionId, {
      status: "rejected",
      rejectionReason: reason
    });
  }

  async function updateCommentStatus(record: UnifiedCommentRecord, nextStatus: "visible" | "hidden") {
    if (record.domain === "post") {
      await apiClient.updateAdminPostCommentStatus(record.id, { status: nextStatus });
      await postCommentsQuery.refetch();
      return;
    }
    if (record.domain === "review") {
      await apiClient.updateAdminReviewCommentStatus(record.id, { status: nextStatus });
      await reviewCommentsQuery.refetch();
      return;
    }
    if (record.domain === "ranking") {
      await apiClient.updateAdminRankingCommentStatus(record.id, { status: nextStatus });
      await rankingCommentsQuery.refetch();
      return;
    }
    await apiClient.updateAdminRankingItemCommentStatus(record.id, { status: nextStatus });
    await rankingItemCommentsQuery.refetch();
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      await Promise.all([
        postsQuery.refetch(),
        modelsQuery.refetch(),
        reviewsQuery.refetch(),
        rankingsQuery.refetch(),
        rankingItemsQuery.refetch()
      ]);
    } catch (reason: unknown) {
      setActionError(reason instanceof Error ? reason.message : "处理举报内容失败");
    }
  }

  return (
    <AdminPage
      actions={
        <Input.Search
          allowClear
          onChange={(event) => {
            setSearchText(event.target.value);
          }}
          placeholder="搜索被举报的标题、作者、摘要或评论内容"
          style={{ width: 320 }}
          value={searchText}
        />
      }
      description="把已进入举报链路的内容拉到同一页集中处理，优先完成隐藏、驳回和恢复操作。"
      title="举报内容审核"
    >
      {actionError ? <div className="admin-login__error">{actionError}</div> : null}

      <div className="admin-field-stack">
        <AdminPanel title="被举报的文章 / 动态">
          <Table
            bordered
            columns={[
              {
                key: "cover",
                render: (_, record: ReportedPost) =>
                  record.images[0]?.url ? (
                    <Image alt={record.title} height={64} preview={false} src={record.images[0].url} width={96} />
                  ) : (
                    <div className="admin-cover-thumb admin-cover-thumb--empty">暂无封面</div>
                  ),
                title: "封面",
                width: 120
              },
              {
                key: "title",
                render: (_, record: ReportedPost) => (
                  <div className="admin-table-meta">
                    <div className="admin-table-title">{record.title}</div>
                    <div className="admin-table-subtitle">{record.author.displayName}</div>
                  </div>
                ),
                title: "内容"
              },
              {
                key: "status",
                render: (_, record: ReportedPost) => {
                  const meta = postStatusLabel(record.status);
                  return <Tag color={meta.color}>{meta.text}</Tag>;
                },
                title: "状态",
                width: 120
              },
              {
                key: "reports",
                render: (_, record: ReportedPost) => <Tag color="red">举报 {record.reportCount}</Tag>,
                title: "举报",
                width: 120
              },
              {
                key: "action",
                render: (_, record: ReportedPost) => (
                  <Space size="small" wrap>
                    {record.status !== "rejected" ? (
                      <Button
                        danger
                        onClick={() => {
                          void runAction(async () => {
                            const reason = promptRejectionReason("请输入内容驳回理由");
                            if (!reason) {
                              return;
                            }
                            await apiClient.updateAdminPostStatus(record.id, {
                              status: "rejected",
                              rejectionReason: reason
                            });
                          });
                        }}
                        size="small"
                        type="link"
                      >
                        驳回返修
                      </Button>
                    ) : null}
                    {record.status === "published" ? (
                      <Button
                        onClick={() => {
                          void runAction(async () => {
                            await apiClient.updateAdminPostStatus(record.id, { status: "hidden" });
                          });
                        }}
                        size="small"
                        type="link"
                      >
                        下线隐藏
                      </Button>
                    ) : null}
                    <Button
                      href={
                        record.type === "article"
                          ? ADMIN_ROUTE_PATHS.moderationArticles
                          : ADMIN_ROUTE_PATHS.moderationMoments
                      }
                      size="small"
                      type="link"
                    >
                      前往审核页
                    </Button>
                  </Space>
                ),
                title: "操作",
                width: 240
              }
            ]}
            dataSource={reportedPosts}
            locale={{ emptyText: <Empty description="暂无被举报的帖子内容" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            loading={postsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>

        <AdminPanel title="被举报的机型">
          <Table
            bordered
            columns={[
              {
                key: "title",
                render: (_, record: ReportedModel) => (
                  <div className="admin-table-meta">
                    <div className="admin-table-title">{record.name}</div>
                    <div className="admin-table-subtitle">
                      {record.brand.name} 路 {record.category.name}
                    </div>
                  </div>
                ),
                title: "机型"
              },
              {
                key: "reports",
                render: (_, record: ReportedModel) => <Tag color="red">举报 {record.reportCount ?? 0}</Tag>,
                title: "举报",
                width: 120
              },
              {
                key: "action",
                render: (_, record: ReportedModel) => (
                  <Space size="small" wrap>
                    {record.sourceSubmissionId ? (
                      <Button
                        danger
                        onClick={() => {
                          void runAction(async () => {
                            await rejectModel(record);
                          });
                        }}
                        size="small"
                        type="link"
                      >
                        驳回返修
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => {
                        void runAction(async () => {
                          await hideModel(record);
                        });
                      }}
                      size="small"
                      type="link"
                    >
                      下线隐藏
                    </Button>
                    <Button href={ADMIN_ROUTE_PATHS.managementModels} size="small" type="link">
                      前往机型库
                    </Button>
                  </Space>
                ),
                title: "操作",
                width: 240
              }
            ]}
            dataSource={reportedModels}
            locale={{ emptyText: <Empty description="暂无被举报的机型" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            loading={modelsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>

        <AdminPanel title="被举报的评测 / 榜单 / 榜单条目">
          <Table
            bordered
            columns={[
              {
                key: "title",
                render: (_, record: ReportedReview | ReportedRanking | ReportedRankingItem) => {
                  if ("model" in record) {
                    return (
                      <div className="admin-table-meta">
                        <div className="admin-table-title">{record.model.name}</div>
                        <div className="admin-table-subtitle">{record.author.displayName}</div>
                      </div>
                    );
                  }
                  if ("rankingTitle" in record) {
                    return (
                      <div className="admin-table-meta">
                        <div className="admin-table-title">{record.title}</div>
                        <div className="admin-table-subtitle">{record.rankingTitle}</div>
                      </div>
                    );
                  }
                  return (
                    <div className="admin-table-meta">
                      <div className="admin-table-title">{record.title}</div>
                      <div className="admin-table-subtitle">{record.author.displayName}</div>
                    </div>
                  );
                },
                title: "对象"
              },
              {
                key: "reports",
                render: (_, record: ReportedReview | ReportedRanking | ReportedRankingItem) => (
                  <Tag color="red">举报 {"reportCount" in record ? record.reportCount ?? 0 : 0}</Tag>
                ),
                title: "举报",
                width: 120
              },
              {
                key: "status",
                render: (_, record: ReportedReview | ReportedRanking | ReportedRankingItem) => {
                  if ("model" in record) {
                    const meta = reviewStatusLabel(record.status);
                    return <Tag color={meta.color}>{meta.text}</Tag>;
                  }
                  if ("rankingTitle" in record) {
                    const meta = rankingItemStatusLabel(record.status);
                    return <Tag color={meta.color}>{meta.text}</Tag>;
                  }
                  const meta = rankingStatusLabel(record.status);
                  return <Tag color={meta.color}>{meta.text}</Tag>;
                },
                title: "状态",
                width: 120
              },
              {
                key: "action",
                render: (_, record: ReportedReview | ReportedRanking | ReportedRankingItem) => {
                  if ("model" in record) {
                    return (
                      <Space size="small" wrap>
                        <Button
                          onClick={() => {
                            void runAction(async () => {
                              await apiClient.updateReviewStatus(record.id, {
                                status: record.status === "visible" ? "hidden" : "visible"
                              });
                            });
                          }}
                          size="small"
                          type="link"
                        >
                          {record.status === "visible" ? "下线隐藏" : "恢复显示"}
                        </Button>
                        <Button href="/admin/reviews" size="small" type="link">
                          前往评测页
                        </Button>
                      </Space>
                    );
                  }
                  if ("rankingTitle" in record) {
                    return (
                      <Space size="small" wrap>
                        {record.status !== "rejected" ? (
                          <Button
                            danger
                            onClick={() => {
                              void runAction(async () => {
                                const reason = promptRejectionReason("请输入条目驳回理由");
                                if (!reason) {
                                  return;
                                }
                                await apiClient.updateRankingItemStatus(record.id, {
                                  status: "rejected",
                                  rejectionReason: reason
                                });
                              });
                            }}
                            size="small"
                            type="link"
                          >
                            驳回返修
                          </Button>
                        ) : null}
                        {record.status === "published" ? (
                          <Button
                            onClick={() => {
                              void runAction(async () => {
                                await apiClient.updateRankingItemStatus(record.id, { status: "hidden" });
                              });
                            }}
                            size="small"
                            type="link"
                          >
                            下线隐藏
                          </Button>
                        ) : null}
                        <Button href={ADMIN_ROUTE_PATHS.moderationRankingItems} size="small" type="link">
                          前往条目审核
                        </Button>
                      </Space>
                    );
                  }

                  return (
                    <Space size="small" wrap>
                      {record.status !== "rejected" ? (
                        <Button
                          danger
                          onClick={() => {
                            void runAction(async () => {
                              const reason = promptRejectionReason("请输入榜单驳回理由");
                              if (!reason) {
                                return;
                              }
                              await apiClient.updateRankingStatus(record.id, {
                                status: "rejected",
                                rejectionReason: reason
                              });
                            });
                          }}
                          size="small"
                          type="link"
                        >
                          驳回返修
                        </Button>
                      ) : null}
                      {record.status === "published" ? (
                        <Button
                          onClick={() => {
                            void runAction(async () => {
                              await apiClient.updateRankingStatus(record.id, { status: "hidden" });
                            });
                          }}
                          size="small"
                          type="link"
                        >
                          下线隐藏
                        </Button>
                      ) : null}
                      <Button href={ADMIN_ROUTE_PATHS.moderationRankings} size="small" type="link">
                        前往榜单审核
                      </Button>
                    </Space>
                  );
                },
                title: "操作",
                width: 260
              }
            ]}
            dataSource={[...reportedReviews, ...reportedRankings, ...reportedRankingItems]}
            locale={{ emptyText: <Empty description="暂无被举报的评测、榜单或条目" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            loading={reviewsQuery.isLoading || rankingsQuery.isLoading || rankingItemsQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>

        <AdminPanel title="被举报的评论">
          <Table
            bordered
            columns={[
              {
                key: "source",
                render: (_, record: UnifiedCommentRecord) => (
                  <div className="admin-table-meta">
                    <div className="admin-table-title">{record.sourceTitle}</div>
                    <div className="admin-table-subtitle">
                      {record.authorName} 路 {record.sourceSubtitle}
                    </div>
                  </div>
                ),
                title: "来源"
              },
              {
                dataIndex: "content",
                key: "content",
                title: "评论内容"
              },
              {
                key: "reports",
                render: (_, record: UnifiedCommentRecord) => <Tag color="red">举报 {record.reportCount}</Tag>,
                title: "举报",
                width: 120
              },
              {
                key: "status",
                render: (_, record: UnifiedCommentRecord) => {
                  const meta = commentStatusLabel(record.status);
                  return <Tag color={meta.color}>{meta.text}</Tag>;
                },
                title: "状态",
                width: 120
              },
              {
                key: "action",
                render: (_, record: UnifiedCommentRecord) => (
                  <Space size="small" wrap>
                    <Button
                      onClick={() => {
                        void runAction(async () => {
                          await updateCommentStatus(record, record.status === "visible" ? "hidden" : "visible");
                        });
                      }}
                      size="small"
                      type="link"
                    >
                      {record.status === "visible"
                        ? "下线隐藏"
                        : record.status === "pending"
                          ? "通过显示"
                          : "恢复显示"}
                    </Button>
                    <Button href={ADMIN_ROUTE_PATHS.moderationComments} size="small" type="link">
                      前往评论审核
                    </Button>
                  </Space>
                ),
                title: "操作",
                width: 220
              }
            ]}
            dataSource={reportedComments}
            locale={{ emptyText: <Empty description="暂无被举报的评论" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
            loading={
              postCommentsQuery.isLoading ||
              reviewCommentsQuery.isLoading ||
              rankingCommentsQuery.isLoading ||
              rankingItemCommentsQuery.isLoading
            }
            rowKey={(record) => `${record.domain}-${record.id}`}
            size="middle"
          />
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
