# REQ-NPM-CLI：CLI 命令改用 npm 运行方式

> 状态：draft → 待确认
> 日期：2026-05-08
> 背景：用户全局安装 `jarvis-agent-factory` 后，在某些终端直接执行 `jarvis` 命令时因脚本策略被拦截（如 PowerShell 执行策略禁止 `.ps1`，或系统安全策略禁止直接执行 `.js` 脚本文件）。

---

## 问题诊断

`package.json` 的 `bin` 字段指向 `bin/jarvis.js`（含 `#!/usr/bin/env node` shebang）。npm 全局安装后在 Windows 上生成：
- `jarvis.cmd` — CMD 批处理包装器（直接调 `node`，不依赖 PowerShell）
- `jarvis.ps1` — PowerShell 包装器（受 ExecutionPolicy 约束）

**失效路径：** PowerShell 终端优先匹配 `.ps1`，触发 `Restricted` 或 `RemoteSigned` 策略拦截 → 即使同目录有 `.cmd` 也报错退出。

**终端兼容性对比：**

| 终端 | `jarvis.cmd` | `jarvis.ps1` |
|------|-------------|-------------|
| CMD | ✅ 正常 | N/A |
| PowerShell (Restricted) | ✅ 正常（需显式 `jarvis.cmd`） | ❌ 拦截 |
| PowerShell (RemoteSigned) | ✅ 正常 | ✅ 正常（本地脚本）|
| Git Bash / WSL | ✅ 正常 | N/A |
| 企业沙箱终端 | ⚠️ 取决于 .cmd 许可 | ❌ 通常拦截 |

---

## 需求清单

### REQ-NPM-001：移除 shebang，标识为 npm-only 入口
**优先级：** P0（阻断）
**描述：** `bin/jarvis.js` 移除 `#!/usr/bin/env node` 首行，文件中标注"此文件仅供 npm bin 包装器调用，不直接执行"。
**理由：** npm 的 `.cmd`/符号链接已负责启动 node，shebang 多余且会在 Windows 上诱导系统尝试直接执行 `.js` 文件。

### REQ-NPM-002：添加 jarvis.cmd 入口兜底文件
**优先级：** P0（阻断）
**描述：** 在 `bin/` 目录新增 `jarvis.cmd` 文件，内容为标准的 npm 生成的 cmd 包装器格式：
```cmd
@ECHO off
SETLOCAL
SET "dp0=%~dp0"
IF EXIST "%dp0%\node.exe" (
  SET "_prog=%dp0%\node.exe"
) ELSE (
  SET "_prog=node"
)
"%_prog%" "%dp0%\jarvis.js" %*
ENDLOCAL
EXIT /b %ERRORLEVEL%
```
**理由：** 提供不依赖 PowerShell 的 Windows 入口。用户在任何终端输入 `jarvis` 时，系统优先找到 `.cmd`，完全绕开 PowerShell 执行策略。

### REQ-NPM-003：package.json bin 字段指向 cmd
**优先级：** P0（阻断）
**描述：** `package.json` 的 `bin` 字段改为：
```json
{
  "jarvis": "bin/jarvis.cmd",
  "jaf": "bin/jarvis.cmd"
}
```
**权衡说明：** npm 的 `bin` 字段允许指向任意可执行文件。指向 `.cmd` 后：
- Windows ✅：npm 将该 `.cmd` 复制/链接到全局 bin 目录，直接可用
- macOS/Linux ❌：`.cmd` 不可执行

因此需要在 `bin/` 中同时提供 `jarvis.cmd`（Windows）和一个无扩展名的 shell 包装器 `jarvis`（Unix），并通过 npm 的 `os` 区分……但这不可行，因为 `bin` 字段不支持平台条件。

**改选方案：** `bin` 字段保持指向 `bin/jarvis.js`，不改为 `.cmd`。原因：
- npm 在 Windows 上**自动生成** `jarvis.cmd` 和 `jarvis.ps1`，不需要手动维护
- 问题只出在 PowerShell 优先匹配 `.ps1` 的场景
- 改为 `.cmd` 会破坏 macOS/Linux

### REQ-NPM-003（修订）：不修改 bin 字段，用别的方式解决
**描述：** 保持 `bin` 字段指向 `bin/jarvis.js`。改为在安装过程中（`install.ts`）自动检测终端环境并给出使用提示。

### REQ-NPM-004：添加 npm run jarvis 开发脚本
**优先级：** P1（高）
**描述：** 在项目 `package.json` 中添加：
```json
"scripts": {
  "jarvis": "node dist/src/cli.js",
  "jarvis:dev": "tsx src/cli.ts"
}
```
开发者可通过 `npm run jarvis -- <命令>` 调用 CLI，完全绕开脚本执行策略。
**理由：** 为开发/CI 环境提供不依赖全局安装的调用方式。

### REQ-NPM-005：模板 skill 中的 node 直接调用改为 npm/npx
**优先级：** P2（中）
**描述：**
- `mcp-builder/SKILL.md`（3 个平台副本）中 `node dist/index.js` → `npx <package-name>` 或 `npm start`
- `writing-skills/SKILL.md`（3 个平台副本）中 `./render-graphs.js` → `node render-graphs.js`（明确用 node 前缀而非 shebang）
- `render-graphs.js`（3 个平台副本）移除 shebang，标记为"通过 node 调用"

### REQ-NPM-006：安装后提示终端兼容性
**优先级：** P2（中）
**描述：** `jarvis doctor` 命令中增加终端检测：
- Windows + PowerShell → 提示 `.cmd` 入口可用，建议 `cmd /c jarvis` 或检查 `ExecutionPolicy`
- 输出 `npx jarvis` 作为备选命令

---

## 方案总结

| 策略 | 适用场景 |
|------|---------|
| npm 全局安装 + `jarvis.cmd` 自动生成 | 标准 Windows 终端（CMD / Git Bash），npm 已处理 |
| `npx jarvis` | 任意终端，npx 本身是 .cmd，不依赖 .ps1 |
| `npm run jarvis` | 开发者/CI 环境，完全绕开全局安装 |
| `cmd /c jarvis` | PowerShell Restricted 用户的最后手段 |

**核心修改只涉及 2 个文件：**
1. `bin/jarvis.js` — 移除 shebang
2. `package.json` — 添加 `jarvis` / `jarvis:dev` 脚本

其余模板修改（REQ-NPM-005/006）为附带改进。
