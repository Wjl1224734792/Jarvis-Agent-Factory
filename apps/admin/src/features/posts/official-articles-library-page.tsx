import { useQuery } from "@tanstack/react-query";
import { Button, Input, Modal, Space, Table } from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { ADMIN_ROUTE_PATHS } from "../../lib/admin-routes";
import { apiClient } from "../../lib/api-client";

type OfficialArticleRecord = Awaited<ReturnType<typeof apiClient.listOfficialArticles>>["items"][number];

function officialArticleStatusLabel(status: OfficialArticleRecord["status"]) {
  switch (status) {
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已驳回";
    case "hidden":
      return "已隐藏";
  }
}

export function OfficialArticlesLibraryPage() {
  const navigate = useNavigate();
  const articlesQuery = useQuery({
    queryKey: ["admin-official-articles"],
    queryFn: () => apiClient.listOfficialArticles()
  });
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredArticles = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const items = articlesQuery.data?.items ?? [];
    if (!keyword) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.author.displayName, item.contentCategory?.name ?? ""]
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [articlesQuery.data?.items, searchText]);

  async function handleDelete(id: string) {
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      await apiClient.deleteAdminOfficialArticle(id);
      setStatusMessage("官方文章已删除。");
      await articlesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "删除官方文章失败");
    } finally {
      setIsSubmitting(false);
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
            placeholder="搜索标题、分类或作者"
            style={{ width: 260 }}
            value={searchText}
          />
          <Button href={ADMIN_ROUTE_PATHS.operationsArticles} type="primary">
            创建文章
          </Button>
        </Space>
      }
      description="管理区承接官方文章历史列表、编辑入口与删除维护。"
      title="官方文章库"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <AdminPanel description="编辑会跳转到运营区的文章工作台。" title="官方文章列表">
        <Table
          bordered
          columns={[
            {
              key: "title",
              render: (_, record: OfficialArticleRecord) => (
                <div className="admin-table-meta">
                  <div className="admin-table-title">{record.title}</div>
                  <div className="admin-table-subtitle">
                    {record.contentCategory?.name ?? "未分类"} · {record.author.displayName}
                  </div>
                </div>
              ),
              title: "文章"
            },
            {
              dataIndex: "status",
              key: "status",
              render: (value: OfficialArticleRecord["status"]) => officialArticleStatusLabel(value),
              title: "状态",
              width: 120
            },
            {
              key: "createdAt",
              render: (_, record: OfficialArticleRecord) =>
                new Date(record.createdAt).toLocaleString("zh-CN", { hour12: false }),
              title: "创建时间",
              width: 180
            },
            {
              key: "action",
              render: (_, record: OfficialArticleRecord) => (
                <Space size="small" wrap>
                  <Button
                    onClick={() => {
                      void navigate(`${ADMIN_ROUTE_PATHS.operationsArticles}?edit=${record.id}`);
                    }}
                    size="small"
                    type="link"
                  >
                    编辑
                  </Button>
                  <Button
                    danger
                    onClick={() => {
                      void Modal.confirm({
                        title: "确认删除官方文章？",
                        content: `删除后将无法恢复：《${record.title}》`,
                        okText: "删除",
                        okButtonProps: { danger: true },
                        cancelText: "取消",
                        onOk: async () => {
                          await handleDelete(record.id);
                        }
                      });
                    }}
                    size="small"
                    type="link"
                  >
                    删除
                  </Button>
                </Space>
              ),
              title: "操作",
              width: 140
            }
          ]}
          dataSource={filteredArticles}
          loading={articlesQuery.isLoading || isSubmitting}
          rowKey={(record) => record.id}
          size="middle"
        />
      </AdminPanel>
    </AdminPage>
  );
}
