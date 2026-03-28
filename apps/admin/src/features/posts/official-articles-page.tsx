import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Select, Space, Table } from "antd";
import { useRef, useState } from "react";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  buildOfficialArticlePayload,
  type OfficialArticleFormValues
} from "./official-articles-helpers";

type OfficialArticleRecord = Awaited<ReturnType<typeof apiClient.listOfficialArticles>>["items"][number];

export function OfficialArticlesPage() {
  const categoriesQuery = useQuery({
    queryKey: ["admin-official-article-categories"],
    queryFn: () => apiClient.listAdminContentCategories()
  });
  const articlesQuery = useQuery({
    queryKey: ["admin-official-articles"],
    queryFn: () => apiClient.listOfficialArticles()
  });
  const [form] = Form.useForm<OfficialArticleFormValues>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageAsset, setImageAsset] = useState<{ id: string; url: string } | null>(null);

  const categoryOptions = (categoriesQuery.data?.items ?? []).map((item) => ({
    label: item.name,
    value: item.id
  }));

  async function handleUpload(file: File) {
    setIsUploading(true);
    setError(null);
    try {
      const response = await apiClient.uploadImage(file);
      setImageAsset({
        id: response.item.id,
        url: response.item.url
      });
      setStatusMessage("封面图已上传，发布时会自动附带。");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "上传封面图失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(values: OfficialArticleFormValues) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      await apiClient.createOfficialArticle(
        buildOfficialArticlePayload(values, imageAsset ? [imageAsset.id] : [])
      );
      form.resetFields();
      setImageAsset(null);
      setStatusMessage("官方文章已提交。若后端审核开关逻辑已接入，管理员发布会直接公开。");
      await articlesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "发布官方文章失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      description="用于发布首页展示的官方文章。分类决定前台归属，封面图可选。"
      title="官方文章"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <div className="admin-split admin-split--wide">
        <AdminPanel description="先写清标题、分类和正文，再决定是否加封面图。" title="发布官方文章">
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              void handleSubmit(values);
            }}
            variant="filled"
          >
            <Form.Item label="文章标题" name="title" rules={[{ required: true, message: "请输入文章标题" }]}>
              <Input placeholder="例如：飞加网官方续航观察" />
            </Form.Item>
            <Form.Item
              label="内容分类"
              name="contentCategoryId"
              rules={[{ required: true, message: "请选择内容分类" }]}
            >
              <Select
                loading={categoriesQuery.isLoading}
                options={categoryOptions}
                placeholder="选择前台栏目"
              />
            </Form.Item>
            <Form.Item label="正文" name="content" rules={[{ required: true, message: "请输入正文" }]}>
              <Input.TextArea
                className="admin-textarea"
                placeholder="输入将展示给前台用户的官方内容。"
                rows={12}
              />
            </Form.Item>
            <div className="admin-uploader">
              <div>
                <div className="admin-panel__title">封面图</div>
                <div className="admin-panel__description">可选。建议用于首页首屏和详情头图。</div>
              </div>
              <Space align="center" size="middle" wrap>
                <Button
                  loading={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  type="default"
                >
                  {isUploading ? "上传中..." : "上传封面图"}
                </Button>
                {imageAsset ? <span className="admin-muted">已附带 1 张图片</span> : null}
              </Space>
              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void handleUpload(file);
                  }
                }}
                ref={fileInputRef}
                type="file"
              />
              {imageAsset ? (
                <div className="admin-image-preview">
                  <img alt="官方文章封面" src={imageAsset.url} />
                </div>
              ) : null}
            </div>
            <div className="admin-form-actions">
              <Button htmlType="submit" loading={isSubmitting} type="primary">
                发布官方文章
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <AdminPanel description="用于确认后台已发布过哪些官方文章。" title="最近官方文章">
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
                title: "状态",
                width: 120
              },
              {
                key: "createdAt",
                render: (_, record: OfficialArticleRecord) =>
                  new Date(record.createdAt).toLocaleString("zh-CN", { hour12: false }),
                title: "创建时间",
                width: 180
              }
            ]}
            dataSource={articlesQuery.data?.items ?? []}
            loading={articlesQuery.isLoading}
            rowKey={(record) => record.id}
            size="middle"
          />
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
