# REQ: 同步 publish/sync 到 Web 面板 + flows 文档

## REQ-001: Web 面板指令页面显示 publish 和 sync

- 更新 `web/src/pages/Commands.tsx` 的 `FALLBACK_COMMANDS` 数组
- 添加 `publish` 和 `sync` 命令条目
- 保持与现有格式一致

## REQ-002: 创建 flows 文档

在 `docs/flows/` 下创建：
- `publish.md` — 一键发布流程说明
- `sync.md` — 项目文档同步流程说明

格式参考已有的 flows 文档（如 `jarvis-lite.md`、`bug-fix.md`）。

## REQ-003: 构建验证

- `npm run build` 后确认 `dist/web/index.html` 包含更新后的 FALLBACK_COMMANDS
