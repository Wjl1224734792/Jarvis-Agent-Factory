# `/cleanup` — 安全清理 Jarvis

> 细粒度移除 Jarvis 安装文件，不误删用户自有文件

```mermaid
flowchart TD
    A["/cleanup"] --> B[步骤0: 加载技能+注册引擎]
    B --> C{确认清理范围}
    C -->|仅配置| D["jarvis remove claude"]
    C -->|配置+引擎| E["jarvis remove claude --engine --force"]
    C -->|全局全部| F["jarvis remove claude -g --engine --force"]
    D --> G["细粒度 hash 匹配<br/>只删 Jarvis 安装的文件"]
    E --> G
    F --> G
    G --> H["预览(dry-run)"]
    H --> I{用户确认?}
    I -->|是| J[执行清理]
    I -->|否| K[中止]
    J --> L[清理完成]
    L --> M["jarvis doctor<br/>验证清理结果"]
```

## 清理内容

| 清理项 | 机制 |
|--------|------|
| `.claude/agents/` 模板 | Hash 匹配 → 只删 Jarvis 安装的 |
| `.claude/commands/` 模板 | Hash 匹配 → 只删 Jarvis 安装的 |
| `.claude/skills/` 模板 | Hash 匹配 → 只删 Jarvis 安装的 |
| `.mcp.json` | 只移除 jarvis-engine + playwright |
| `settings.json` hooks | 只移除 `_jarvisManagedHooks` 标记的 |
| `.jarvis/engine.db` | 需 `--engine` 标志 |
| `.jarvis/YYYY-MM-DD/` | 需 `--engine` 标志 |

## 红线

- 绝不删除用户自有文件（Hash 不匹配则跳过）
- `.jarvis/` 引擎数据需显式 `--engine`
- `--dry-run` 先预览，再执行
