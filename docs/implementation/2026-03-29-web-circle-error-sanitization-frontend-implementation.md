# 当前实现目标

- 在 `apps/web` 范围内完成第二轮前端改造：
  - 全站错误脱敏接入 Web `api-client`
  - 修复飞友圈瀑布流与骨架屏固定三列问题
  - 重做飞友圈详情弹窗的多图/单视频媒体展示
  - 动态发布页改为“多图或单视频”互斥
  - 补相关前端测试

# 输入依据

- 用户最新批准的《飞加网第二轮修复与榜单审核/飞友圈体验重构计划》
- 仓库约束：
  - 根目录 `AGENTS.md`
  - `apps/web/AGENTS.md`
- 主会话分配的前端任务边界：
  - 仅修改 `apps/web/*`
  - 不触碰 `packages/*`、`apps/server/*`、`apps/admin/*`

# 工作区模式

- 工作区：`apps/web`
- 变更类型：
  - `test_after`：错误脱敏、飞友圈瀑布流/详情、动态发布互斥
- 协作方式：
  - 假定主会话会继续推进后端 `moment` 互斥校验
  - 本次前端只做页面与本地 API 包装适配，不伪造后端已完成

# 变更文件 / 变更范围

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/routes/circle-page.tsx`
- `apps/web/src/routes/circle-page-helpers.ts`
- `apps/web/src/routes/publish-moment-page.tsx`
- `apps/web/src/routes/publish-moment-helpers.ts`
- `apps/web/src/components/page-skeletons.tsx`
- `apps/web/tests/api-client-sanitization.test.ts`
- `apps/web/tests/circle-page-helpers.test.ts`
- `apps/web/tests/publish-moment-helpers.test.ts`

# 实现说明

## 1. 错误脱敏

- 在 `apps/web/src/lib/api-client.ts` 中新增：
  - `sanitizeWebApiErrorMessage`
  - `mapWebApiError`
- 本地 `getJson/postJson` 先做脱敏。
- 对 `sharedClient` 暴露出来的所有方法统一包一层错误映射，避免页面直接拿到后端原始 `message`。
- 映射策略：
  - 登录/鉴权类错误 -> “请先登录后再继续操作。”
  - 权限类错误 -> “当前无权执行此操作。”
  - 404/缺失类错误 -> “请求的内容不存在或已被移除。”
  - 参数/校验类错误 -> “提交内容有误，请检查后重试。”
  - 5xx/内部异常 -> “服务暂时不可用，请稍后重试。”
  - 兜底 -> “操作失败，请稍后重试。”

## 2. 飞友圈瀑布流与骨架屏

- 新增 `circle-page-helpers.ts`：
  - 卡片高度节奏不再按 `index % 3` 固定三列思路组织
  - 媒体项构造与轮播索引切换抽离
- `circle-page.tsx` 调整：
  - 去掉原来的 `max-w-[680px]`
  - 瀑布流容器改成整页可用宽度，依赖 `columnWidth + columnGap` 自适应列数
  - 卡片底部增加作者头像
  - 视频动态卡片在右上角显示小播放图标
- `page-skeletons.tsx` 同步调整：
  - `MasonryFeedSkeleton` 改为更宽的响应式列宽
  - 骨架高度复用 `getCircleCardHeightClass`
  - 底部骨架增加头像结构，和真实卡片一致

## 3. 飞友圈详情弹窗

- 详情弹窗改成左侧媒体区 + 右侧信息区。
- 媒体逻辑：
  - 有视频时只展示一个视频播放器
  - 没视频时按图片数组做轮播
- 多图支持：
  - 左右箭头
  - 底部圆点
  - 右上角 `current/total` 计数
- 关闭弹窗时会重置评论输入和当前媒体索引。

## 4. 动态发布页互斥媒体规则

- 新增 `publish-moment-helpers.ts`：
  - 图片总量上限判断
  - 单视频替换判断
  - 提交前媒体互斥判断
- `publish-moment-page.tsx` 调整：
  - 图片仍支持最多 6 张
  - 视频改为只允许 1 个，`input[type=file]` 取消 `multiple`
  - 上传图片时自动清空当前视频
  - 上传视频时自动清空当前图片
  - 页面文案明确“多图或单视频”规则
  - 卡片预览区如果当前是视频，会显示播放图标

# 测试和验证结果

已通过：

- `bunx vitest run --root . --config vitest.config.ts apps/web/tests/api-client-sanitization.test.ts apps/web/tests/circle-page-helpers.test.ts apps/web/tests/publish-moment-helpers.test.ts apps/web/tests/auth-store-persistence.test.ts apps/web/tests/models-page-helpers.test.ts apps/web/tests/rich-text-toolbar-config.test.ts`
- `bunx vitest run --root . --config vitest.config.ts apps/web/tests`
- `bunx tsc -p apps/web/tsconfig.json --noEmit`

未执行：

- 浏览器手工烟测
- Playwright/真实页面截图验证

# 边界和异常处理

- 只在 Web 侧做了错误脱敏显示，不修改共享 `http-client`。
- 前端已经限制动态为“多图或单视频”，但最终仍依赖后端补 moment 创建校验，防止绕过前端。
- 视频卡片的缩略图仍优先用现有图片或回退占位图；未新增真实视频封面抽帧逻辑。
- 详情弹窗只处理“图片轮播”或“单视频播放”，不扩展到混合媒体，因为本轮前端已禁止混合。

# 风险 / 未解决项

- 如果主会话后端未补 `moment` 互斥校验，理论上仍可通过绕开前端提交混合媒体。
- `apps/web/src/lib/api-client.ts` 的错误脱敏是 Web 本地实现，Admin 仍需主会话在另一侧单独处理。
- 瀑布流仍基于 CSS columns，不是虚拟化 masonry；当前任务已修复固定列问题，但没有引入更重的布局引擎。

# 需要 backend_implementer 配合的点

- `posts/moments` 创建接口需要补服务端校验：
  - 多图或单视频互斥
  - 视频数量最多 1
- 如果未来要让视频卡片展示真实封面，后端或上传流程需要提供 `poster`

# 推荐的下一步

- 主会话继续完成：
  - `moment` 服务端互斥校验
  - 社区榜单审核与设置开关
  - Admin 榜单工作台和概览页修复
- 完成后做一次浏览器烟测：
  - 飞友圈列表不同宽度
  - 多图详情轮播
  - 单视频详情播放
  - 动态发布切换图片/视频
