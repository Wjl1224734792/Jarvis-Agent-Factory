import { useQuery } from "@tanstack/react-query";
import { Button, Form, Input, Modal, Select, Space, Table } from "antd";
import { useMemo, useRef, useState } from "react";
import { AdminRichTextEditor } from "../../components/admin-rich-text-editor";
import { extractPlainTextFromHtml } from "../../components/admin-rich-text-editor-helpers";
import { AdminPage, AdminPanel } from "../../components/admin-ui";
import { apiClient } from "../../lib/api-client";
import {
  buildOfficialArticlePayload,
  removeMediaFromHtml,
  type OfficialArticleFormValues
} from "./official-articles-helpers";

type OfficialArticleRecord = Awaited<ReturnType<typeof apiClient.listOfficialArticles>>["items"][number];
type UploadedMediaAsset = { id: string; url: string; fileName?: string };

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

function createMediaAssetList(
  items: Array<{ id: string; url: string; fileName: string }> | undefined,
  skipFirst = false
) {
  return (items ?? [])
    .slice(skipFirst ? 1 : 0)
    .map((item) => ({ id: item.id, url: item.url, fileName: item.fileName }));
}

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coverImage, setCoverImage] = useState<UploadedMediaAsset | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedMediaAsset[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<UploadedMediaAsset[]>([]);
  const [editorHtml, setEditorHtml] = useState("");
  const [editorText, setEditorText] = useState("");
  const watchedTitle = Form.useWatch("title", form);
  const watchedCategoryId = Form.useWatch("contentCategoryId", form);

  const categoryOptions = (categoriesQuery.data?.items ?? []).map((item) => ({
    label: item.name,
    value: item.id
  }));
  const selectedCategoryLabel = useMemo(() => {
    return categoryOptions.find((item) => item.value === watchedCategoryId)?.label ?? "未选择分类";
  }, [categoryOptions, watchedCategoryId]);

  const previewImageUrl = coverImage?.url ?? uploadedImages[0]?.url ?? null;

  function removeMediaAsset(assetUrl: string, kind: "image" | "video") {
    const nextHtml = removeMediaFromHtml(editorHtml, assetUrl);
    setEditorHtml(nextHtml);
    setEditorText(extractPlainTextFromHtml(nextHtml));

    if (kind === "image") {
      setUploadedImages((current) => current.filter((item) => item.url !== assetUrl));
      return;
    }

    setUploadedVideos((current) => current.filter((item) => item.url !== assetUrl));
  }

  function resetFormState() {
    form.resetFields();
    setEditingId(null);
    setError(null);
    setStatusMessage(null);
    setCoverImage(null);
    setUploadedImages([]);
    setUploadedVideos([]);
    setEditorHtml("");
    setEditorText("");
  }

  async function uploadImages(files: FileList | null) {
    if (!files?.length) {
      return [];
    }

    setIsUploading(true);
    try {
      const uploads: UploadedMediaAsset[] = [];
      for (const file of Array.from(files)) {
        const response = await apiClient.uploadImage(file);
        uploads.push({
          id: response.item.id,
          url: response.item.url,
          fileName: response.item.fileName
        });
      }
      setUploadedImages((current) => [...current, ...uploads]);
      return uploads;
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadVideos(files: FileList | null) {
    if (!files?.length) {
      return [];
    }

    setIsUploading(true);
    try {
      const uploads: UploadedMediaAsset[] = [];
      for (const file of Array.from(files)) {
        const response = await apiClient.uploadPostVideo(file);
        uploads.push({
          id: response.item.id,
          url: response.item.url,
          fileName: response.item.fileName
        });
      }
      setUploadedVideos((current) => [...current, ...uploads]);
      return uploads;
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadCover(file: File | null) {
    if (!file) {
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const response = await apiClient.uploadImage(file);
      setCoverImage({
        id: response.item.id,
        url: response.item.url,
        fileName: response.item.fileName
      });
      setStatusMessage("封面图上传成功。");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "封面图上传失败");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleEdit(id: string) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);
    try {
      const response = await apiClient.getAdminOfficialArticle(id);
      const item = response.item;
      const [firstImage, ...restImages] = item.images;

      setEditingId(item.id);
      form.setFieldsValue({
        title: item.title,
        contentCategoryId: item.contentCategory?.id ?? undefined
      });
      setCoverImage(firstImage ? { id: firstImage.id, url: firstImage.url, fileName: firstImage.fileName } : null);
      setUploadedImages(restImages.map((image) => ({ id: image.id, url: image.url, fileName: image.fileName })));
      setUploadedVideos(createMediaAssetList(item.videos));
      setEditorHtml(item.contentHtml ?? "");
      setEditorText(item.content);
      setStatusMessage(`已载入文章《${item.title}》进行编辑。`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "加载官方文章失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      await apiClient.deleteAdminOfficialArticle(id);
      if (editingId === id) {
        resetFormState();
      }
      setStatusMessage("官方文章已删除。");
      await articlesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "删除官方文章失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(values: OfficialArticleFormValues) {
    setIsSubmitting(true);
    setError(null);
    setStatusMessage(null);

    const payload = buildOfficialArticlePayload(
      {
        ...values,
        content: editorText,
        contentHtml: editorHtml
      },
      Array.from(new Set([coverImage?.id, ...uploadedImages.map((item) => item.id)].filter(Boolean))) as string[],
      uploadedVideos.map((item) => item.id)
    );

    try {
      if (editingId) {
        await apiClient.updateAdminOfficialArticle(editingId, payload);
        setStatusMessage("官方文章已更新。");
      } else {
        await apiClient.createOfficialArticle(payload);
        resetFormState();
        setStatusMessage("官方文章已发布。");
      }

      await articlesQuery.refetch();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "保存官方文章失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminPage
      actions={
        editingId ? (
          <Button onClick={resetFormState} type="default">
            新建文章
          </Button>
        ) : null
      }
      description="在同一个工作台中完成官方文章的新建、编辑、预览与删除。"
      title="官方文章"
    >
      {error ? <div className="admin-login__error">{error}</div> : null}
      {statusMessage ? <div className="admin-shell__banner">{statusMessage}</div> : null}

      <div className="admin-split admin-split--wide">
        <AdminPanel
          description="填写标题、选择分类、管理封面与正文内容，并保持右侧预览实时同步。"
          title={editingId ? "编辑官方文章" : "新建官方文章"}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => {
              void handleSubmit(values);
            }}
            variant="filled"
          >
            <Form.Item label="标题" name="title" rules={[{ required: true, message: "请输入文章标题" }]}>
              <Input placeholder="例如：低空空域周报" />
            </Form.Item>
            <Form.Item
              label="内容分类"
              name="contentCategoryId"
              rules={[{ required: true, message: "请选择内容分类" }]}
            >
              <Select loading={categoriesQuery.isLoading} options={categoryOptions} placeholder="选择分类" />
            </Form.Item>
            <Form.Item label="正文" required>
              <AdminRichTextEditor
                onChange={(value) => {
                  setEditorHtml(value.html);
                  setEditorText(value.plainText);
                }}
                onUploadImage={uploadImages}
                onUploadVideo={uploadVideos}
                placeholder="请输入官方文章正文..."
                value={editorHtml}
              />
            </Form.Item>
            <div className="admin-uploader">
              <div>
                <div className="admin-panel__title">封面图</div>
                <div className="admin-panel__description">可选。封面图会优先展示在列表卡片与详情页头图位置。</div>
              </div>
              <Space align="center" size="middle" wrap>
                <Button loading={isUploading} onClick={() => fileInputRef.current?.click()} type="default">
                  {isUploading ? "上传中..." : "上传封面"}
                </Button>
                {coverImage ? <span className="admin-muted">当前封面：{coverImage.fileName ?? coverImage.id}</span> : null}
                {coverImage ? (
                  <Button
                    onClick={() => {
                      setCoverImage(null);
                    }}
                    size="small"
                    type="link"
                  >
                    清除封面
                  </Button>
                ) : null}
              </Space>
              <input
                accept="image/*"
                hidden
                onChange={(event) => {
                  void uploadCover(event.target.files?.[0] ?? null);
                }}
                ref={fileInputRef}
                type="file"
              />
            </div>
            <div className="admin-form-actions">
              <Button disabled={!editorText.trim()} htmlType="submit" loading={isSubmitting} type="primary">
                {editingId ? "保存文章" : "发布文章"}
              </Button>
            </div>
          </Form>
        </AdminPanel>

        <div className="admin-field-stack">
          <AdminPanel description="发布前确认封面、分类、标题和正文效果。" title="实时预览">
            <div className="admin-article-preview">
              {previewImageUrl ? (
                <div className="admin-image-preview">
                  <img alt="官方文章封面" src={previewImageUrl} />
                </div>
              ) : (
                <div className="admin-article-preview__placeholder">未设置封面图</div>
              )}
              <div className="admin-article-preview__meta">{selectedCategoryLabel}</div>
              <div className="admin-article-preview__title">{watchedTitle || "文章标题"}</div>
              <div
                className="admin-article-preview__body"
                dangerouslySetInnerHTML={{
                  __html: editorHtml || "<p>正文预览会显示在这里。</p>"
                }}
              />
            </div>
          </AdminPanel>

          {(uploadedImages.length > 0 || uploadedVideos.length > 0) ? (
            <AdminPanel description="保存前可移除已上传的正文媒体，移除后会同步从正文中删除。" title="已上传媒体">
              {uploadedImages.length > 0 ? (
                <div className="admin-preview-list">
                  {uploadedImages.map((image) => (
                    <div className="admin-preview-item" key={image.id}>
                      <div className="admin-row-actions">
                        <span className="admin-muted">{image.fileName ?? image.id}</span>
                        <Button
                          onClick={() => {
                            removeMediaAsset(image.url, "image");
                          }}
                          size="small"
                          type="link"
                        >
                          移除图片
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {uploadedVideos.length > 0 ? (
                <div className="admin-preview-list">
                  {uploadedVideos.map((video) => (
                    <div className="admin-preview-item" key={video.id}>
                      <div className="admin-row-actions">
                        <span className="admin-muted">{video.fileName ?? video.id}</span>
                        <Button
                          onClick={() => {
                            removeMediaAsset(video.url, "video");
                          }}
                          size="small"
                          type="link"
                        >
                          移除视频
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </AdminPanel>
          ) : null}

          <AdminPanel description="支持在同一页继续编辑或删除历史官方文章。" title="官方文章列表">
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
                          void handleEdit(record.id);
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
              dataSource={articlesQuery.data?.items ?? []}
              loading={articlesQuery.isLoading || isSubmitting}
              rowKey={(record) => record.id}
              size="middle"
            />
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
