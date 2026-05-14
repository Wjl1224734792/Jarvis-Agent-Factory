# 测试摘要：文件细粒度同步机制

> 版本：1.0 | 日期：2026-05-14

## 测试范围

覆盖 REQ-001~006 全部 6 个需求的实现代码（TASK-001~006）。

## 测试结果

### 单元测试

| 测试文件 | 测试数 | 状态 |
|---------|--------|------|
| `tests/gates.test.ts` | 53 | ✅ pass |
| `tests/db.test.ts` | 41 | ✅ pass |
| `tests/install-section-hash.test.ts` (新增) | 13 | ✅ pass |
| `tests/install-merge.test.ts` (新增) | 24 | ✅ pass |
| 其余 15 个测试文件 | 194 | ✅ pass |

**总计：19 文件 / 325 测试 / 0 失败**

### 功能验证（手动）

| REQ | 验证项 | 结果 |
|-----|--------|------|
| REQ-001 | 模板文件含 `version`/`updated` frontmatter | ✅ |
| REQ-001 | `readFrontmatter()` 解析无 frontmatter 文件返回 `version: "0.0.0"` | ✅ |
| REQ-002 | `splitMarkdownSections()` 正确分割 `## ` 标题 | ✅ |
| REQ-002 | `computeSectionHashes()` hash 稳定性 | ✅ |
| REQ-002 | `file-hashes.json` 写入 `_v: 2` 格式 | ✅ |
| REQ-003 | 合并场景一（源未变）：保持不变 | ✅ |
| REQ-003 | 合并场景二（安全覆盖）：新源内容 | ✅ |
| REQ-003 | 合并场景三（冲突）：冲突标记写入 | ✅ |
| REQ-003 | 引擎启动扫描冲突文件 | ✅ |
| REQ-004 | JSON 新增 mcpServer | ✅ |
| REQ-004 | JSON 删除 mcpServer（白名单除外） | ✅ |
| REQ-004 | permissions.allow 永不被删除 | ✅ |
| REQ-005 | `jarvis resolve --list` | ✅ |
| REQ-005 | `jarvis resolve --accept user` | ✅ |
| REQ-005 | `jarvis resolve --accept template` | ✅ |
| REQ-006 | 旧格式 file-hashes.json 降级兼容 | ✅ |

## 质量门禁

| 检查 | 结果 |
|------|------|
| Lint | 0 errors, 9 warnings |
| Type-check | 0 errors |
| Build | pass |
| Deps Audit | 0 vulnerabilities |
| Tests | 325/325 pass |

## 结论

全部 6 个 REQ 通过验证，质量门禁全绿，可进入 Gate D 评审。
