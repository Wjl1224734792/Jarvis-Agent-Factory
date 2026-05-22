import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Input, Select, Tag, Card, Spin, Empty, Breadcrumb, Descriptions } from 'antd';
import { BookOutlined, HomeOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api, WikiPageMeta, WikiPageDetail } from '../api';
import './Wiki.css';

const { Title, Text } = Typography;

const CATEGORY_NAMES: Record<string, string> = {
  architecture: '架构',
  decision: '决策',
  pattern: '模式',
  debugging: '调试',
  environment: '环境',
  'session-log': '会话日志',
  reference: '参考',
  convention: '规范',
};

const CATEGORY_COLORS: Record<string, string> = {
  architecture: '#1677ff',
  decision: '#722ed1',
  pattern: '#52c41a',
  debugging: '#fa8c16',
  environment: '#13c2c2',
  'session-log': '#eb2f96',
  reference: '#2f54eb',
  convention: '#faad14',
};

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function Wiki() {
  const [pages, setPages] = useState<WikiPageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<WikiPageDetail | null>(null);

  const loadPages = (project?: string) => {
    setLoading(true);
    api.wikiPages(project).then(setPages).catch(() => setPages([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPages();
    api.projects().then(setProjects).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    loadPages(selectedProject);
  }, [selectedProject]);

  const categories = useMemo(
    () => [...new Set(pages.map(p => p.category).filter(Boolean))] as string[],
    [pages],
  );

  const filtered = useMemo(() => {
    let result = pages;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter) {
      result = result.filter(p => p.category === categoryFilter);
    }
    return result;
  }, [pages, search, categoryFilter]);

  const handleViewPage = async (slug: string) => {
    try {
      const detail = await api.wikiPage(slug);
      setSelectedPage(detail);
    } catch {
      setSelectedPage(null);
    }
  };

  const handleBack = () => {
    setSelectedPage(null);
  };

  // ======== 详情视图 ========
  if (selectedPage) {
    return (
      <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
        <Breadcrumb
          style={{ marginBottom: 16 }}
          items={[
            { title: <><HomeOutlined /> 首页</>, onClick: handleBack, className: 'breadcrumb-link' },
            { title: <><BookOutlined /> 知识库</>, onClick: handleBack, className: 'breadcrumb-link' },
            { title: selectedPage.title },
          ]}
        />
        <Card
          size="small"
          title={null}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedPage.updated?.slice(0, 10)}
            </Text>
          }
        >
          <Title level={4} style={{ marginTop: 0 }}>{selectedPage.title}</Title>
          <Descriptions size="small" column={2} style={{ marginBottom: 16 }} bordered>
            <Descriptions.Item label="分类">
              <Tag color={CATEGORY_COLORS[selectedPage.category]}>{CATEGORY_NAMES[selectedPage.category] || selectedPage.category}</Tag>
            </Descriptions.Item>
            {selectedPage.project && (
              <Descriptions.Item label="项目">
                <Tag color="geekblue">{(selectedPage.project.split(/[\\/]/).filter(Boolean).pop() || selectedPage.project)}</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="标签">
              {selectedPage.tags?.map(t => <Tag key={t}>{t}</Tag>)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">{selectedPage.updated?.slice(0, 19) || '-'}</Descriptions.Item>
            <Descriptions.Item label="大小">{formatSize(selectedPage.size)}</Descriptions.Item>
            {selectedPage.confidence && (
              <Descriptions.Item label="置信度">{selectedPage.confidence}</Descriptions.Item>
            )}
          </Descriptions>
          <div className="wiki-markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeStr = String(children).replace(/\n$/, '');
                  if (match) {
                    return (
                      <SyntaxHighlighter
                        style={oneLight}
                        language={match[1]}
                        PreTag="div"
                      >
                        {codeStr}
                      </SyntaxHighlighter>
                    );
                  }
                  return <code className={className} {...props}>{children}</code>;
                },
              }}
            >
              {selectedPage.body || ''}
            </ReactMarkdown>
          </div>
        </Card>
      </div>
    );
  }

  // ======== 列表视图 ========
  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <BookOutlined style={{ marginRight: 8 }} />知识库
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>共 {pages.length} 页</Text>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <Input
          placeholder="搜索页面标题或标签..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ flex: 1 }}
        />
        {projects.length > 0 && (
          <Select
            placeholder="全部项目"
            value={selectedProject}
            onChange={setSelectedProject}
            allowClear
            style={{ width: 180 }}
            options={projects.map(p => {
              const name = (p || '').split(/[\\/]/).filter(Boolean).pop() || p;
              return { label: name, value: p };
            })}
          />
        )}
        <Select
          placeholder="全部分类"
          value={categoryFilter}
          onChange={setCategoryFilter}
          allowClear
          style={{ width: 160 }}
          options={categories.map(c => ({ label: CATEGORY_NAMES[c] || c, value: c }))}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : filtered.length === 0 ? (
        <Empty
          description={pages.length === 0 ? '知识库为空，使用 /repowiki 添加页面' : '无匹配结果'}
          style={{ paddingTop: 60 }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => (
            <Card
              key={p.slug}
              size="small"
              hoverable
              onClick={() => handleViewPage(p.slug)}
              title={<Text strong>{p.title}</Text>}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {p.updated?.slice(0, 10)}
                </Text>
              }
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <Tag color={CATEGORY_COLORS[p.category]}>{CATEGORY_NAMES[p.category] || p.category}</Tag>
                {p.project && (
                  <Tag color="geekblue">{(p.project.split(/[\\/]/).filter(Boolean).pop() || p.project)}</Tag>
                )}
                {p.tags?.map(t => <Tag key={t}>{t}</Tag>)}
                {p.size > 0 && (
                  <Text type="secondary" style={{ fontSize: 11 }}>{formatSize(p.size)}</Text>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
