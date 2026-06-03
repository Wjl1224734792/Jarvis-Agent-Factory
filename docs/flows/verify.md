# `/verify` — 文档驱动验证

> 基于项目 AGENTS.md 层级文档，收集证据确认改动生效可用

```mermaid
flowchart TD
    A["/verify <what>"] --> B[步骤0: 注册引擎会话]
    B --> C["session_join(pipeline_type: auto)"]
    C --> D["pipeline_guide() 获取上下文"]
    D --> E["第1步: 文档定位"]
    E --> E1["读取受影响目录的 AGENTS.md"]
    E1 --> E2["了解模块用途/关键文件/依赖"]
    E2 --> F["第2步: 证据收集"]
    F --> F1["LSP diagnostics 检查错误"]
    F --> F2["AST search 验证代码结构"]
    F --> F3["测试运行 验证功能正确"]
    F1 --> G["第3步: 证据评估"]
    F2 --> G
    F3 --> G
    G --> H{裁决}
    H -->|证据充分+通过| I["✅ PASS — 置信度 ≥ 80%"]
    H -->|证据不足| J["⚠️ GAP — 标记缺失证据"]
    H -->|证据表明失败| K["❌ FAIL — 附失败用例"]
    I --> L["产出验证报告<br/>.jarvis/YYYY-MM-DD/verify/"]
    J --> L
    K --> L
```

## 验证维度

| 维度 | 检查方式 | 工具 |
|------|---------|------|
| 代码正确性 | LSP diagnostics | `jarvis_lsp_diagnostics` |
| 结构一致性 | AST 模式匹配 | `jarvis_ast_search` |
| 功能正确性 | 测试套件 | Bash + vitest |
| 引用完整性 | LSP findReferences | `jarvis_lsp_find_references` |
| 文档覆盖率 | AGENTS.md 对比 | Read + Grep |
