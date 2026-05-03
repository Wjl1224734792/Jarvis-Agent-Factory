# 飞友圈卡片比例与统一上传网关需求
日期：2026-03-29  
适用范围：`apps/web`、`apps/server`、`packages/db`、`packages/schemas`、`packages/http-client`、`packages/shared`

## 1. 需求摘要
- 飞友圈动态瀑布流卡片需要从当前偏正方形的比例调整为明显“高大于宽”的长方形卡片，同时保持动态瀑布流和骨架屏一致。
- 上传体系需要从“后端接收文件二进制再转存”切换为“统一上传网关 + Provider 适配层 + 前端直传”。
- 目标是一次性全量切换到 `files` 主表和 `fileId` 业务引用，不保留旧的 `post_images` / `video_assets` 直存方案作为主链路。

## 2. 成功标准
- 飞友圈卡片在桌面和移动端都呈现明确的纵向长方形比例，骨架屏与实际卡片一致。
- 上传初始化与完成校验由后端统一签发和校验，前端不持有长期存储密钥。
- 头像、帖子媒体、机型投稿、榜单封面/条目图、富文本图片/视频等统一走新文件模型。
- 现有页面调用链路可以在新接口上闭环，不再依赖旧的 multipart 转传主路径。

## 3. 范围内
- 飞友圈瀑布流卡片宽高比例、骨架屏同步、相关 helper 调整。
- `files` 主表、上传状态、`StorageProvider` 抽象、MinIO provider、上传 init/complete/download 路由。
- `packages/schemas`、`packages/shared`、`packages/http-client` 的上传契约与路由常量。
- `apps/web` 中所有上传入口和预览入口的改造。
- 旧媒体数据向新文件模型的迁移和清理。

## 4. 范围外
- 不做新的产品级媒体功能扩展。
- 不做多云 provider 的生产级完整实现，第一期以 MinIO 为主实现。
- 不重构与本次需求无关的页面布局或业务模块。

## 5. 风险与开放点
- 这是共享契约变更，涉及 DB schema、API schema、http-client 和多个页面，必须分阶段收口。
- 旧表数据需要回填到新文件模型，否则会断开历史内容。
- 业务表目前直接存 URL 或文件外键字段，是否全部改成 `fileId` 需要在实现阶段统一落定。

