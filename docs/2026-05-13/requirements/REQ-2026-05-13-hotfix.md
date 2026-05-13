# 修复Web刷新+CLI安装+模板补齐+归档修复

> 状态: confirmed | 日期: 2026-05-13

## REQ-HF01: Web面板静默更新
**问题**: SSE推送每次触发3次setState重渲染连锁(sessions+MCP+pipeline)，Dashboard流水线状态被覆盖，用户打开的文档面板丢失
**修复**: SSE更新改为浅比较静默更新，不覆盖用户交互状态(mdPreview/展开的Gate)，Dashboard只在数据真正变化时重渲染

## REQ-HF02: Archive恢复/删除修复
**问题**: `handleRestore`和`handleDelete`中`r.ok`检查的是解析后的JSON体而非Fetch Response，`r.ok`始终undefined，恢复/删除永远失败
**修复**: 修正为检查JSON返回的success字段或直接用try/catch

## REQ-HF03: Agents保存修复+功能补齐
**问题**: 同样的`r.ok` bug导致保存失败，empty catch吞掉fetch错误，缺少CRUD
**修复**: 修正保存逻辑，添加agent列表显示文件来源路径

## REQ-HF04: 10个command模板补齐
缺失: test-unit/integration/e2e/perf/security + refactor/hotfix/migrate/evaluate/debug
修复: 将.claude/commands/下占位文件复制到src/templates/platforms/claude/commands/

## REQ-HF05: 5个新skill模板创建
缺失: test-data-factory, perf-testing, security-testing, refactoring, debugging-deep
修复: 在src/templates/platforms/claude/skills/下创建完整SKILL.md

## REQ-HF06: CLI安装MCP配置智能合并
**问题**: installMcp()检查jarvis-engine条目存在就跳过导致新的MCP配置不更新；settings.json权限模板从未安装
**修复**: MCP配置改为深度合并(新条目添加，已有条目保留)；installHooks同时合并权限allow列表

## REQ-HF07: SSE重连优化
**问题**: onerror后5秒固定重连，无退避
**修复**: 指数退避(1s→2s→4s→8s→max 30s)
