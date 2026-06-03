# `/repowiki` — 项目知识库

> 持久化项目知识库，支持增/查/改/删/健康检查。存储到 `.jarvis/wiki/pages/`

```mermaid
flowchart TD
    A["/repowiki <subcommand>"] --> B[步骤0: 注册引擎会话]
    B --> C["session_join(pipeline_type: auto)"]
    C --> D["repowiki_list() 了解当前状态"]
    D --> E{子命令路由}
    E -->|add| F["repowiki_add()<br/>新建单页"]
    E -->|ingest| G["repowiki_ingest()<br/>创建或追加"]
    E -->|query| H["repowiki_query()<br/>关键字搜索"]
    E -->|list| I["repowiki_list()<br/>列出全部页面"]
    E -->|read| J["repowiki_read()<br/>读取完整页面"]
    E -->|delete| K["repowiki_delete()<br/>删除指定页面"]
    E -->|lint| L["repowiki_lint()<br/>健康检查"]
    F --> M[产出/更新 Wiki 页面]
    G --> M
    H --> N[返回搜索结果+摘要]
    I --> O[返回页面清单]
    J --> P[返回页面内容+元数据]
    K --> Q[删除确认]
    L --> R["诊断报告:<br/>孤立页/陈旧页/损坏引用"]
```

## 子命令

| 子命令 | 引擎工具 | 说明 |
|--------|---------|------|
| `add` | `repowiki_add` | 创建单页，slug 重复则拒绝 |
| `ingest` | `repowiki_ingest` | 创建或追加（合并模式），带时间戳 |
| `query` | `repowiki_query` | 纯文本+标签搜索 |
| `list` | `repowiki_list` | 列出所有页面，支持按项目过滤 |
| `read` | `repowiki_read` | 读取完整页面含 frontmatter |
| `delete` | `repowiki_delete` | 不可逆删除 |
| `lint` | `repowiki_lint` | 健康检查：孤立/陈旧/损坏/超大/低置信度 |
