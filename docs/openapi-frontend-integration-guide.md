# OpenAPI 前端对接指南

> 适用对象：移动端 App、微信小程序、Web 前端  
> 接口文档入口：
> - Swagger UI：`/docs`
> - OpenAPI JSON：`/openapi.json`

## 1. 文档定位

本指南不替代 OpenAPI 原始文档，而是补充一层更适合前端开发阅读的说明，帮助前端快速完成以下工作：

- 明确接口分组与页面归属
- 统一认证、上传、分页、错误处理方式
- 对齐登录、发布、互动、评论、举报等核心链路
- 给移动端 / 微信小程序开发提供接口使用顺序

## 2. 接口分组

当前 OpenAPI 主要分为以下标签：

- `auth`
  用于手机号登录、短信验证码、注册补全、刷新会话、获取当前用户。
- `social`
  用于用户主页、当前用户资料、关注关系、通知、手机号换绑。
- `uploads`
  用于统一上传初始化、直传回写、文件地址获取。
- `posts`
  用于首页 Feed、飞友圈 Feed、帖子详情、帖子互动、帖子评论。
- `models`
  用于飞行器列表、飞行器详情、机型互动、机型评论、机型评测。
- `rankings`
  用于榜单、榜单条目、评分对象、榜单评论、评分对象评论。
- `submissions`
  用于飞行器投稿的创建、编辑、查看、审核。
- `brand-applications`
  用于品牌申请的创建、编辑、查看、审核。
- `catalog`
  用于品牌、分类、内容分类等基础数据。
- `settings`
  用于后台站点设置。
- `system`
  用于健康检查。

## 3. 认证约定

### 3.1 Web

- 主要使用 Cookie 会话。
- 适合浏览器环境。

### 3.2 移动端 / 微信小程序

- 建议统一使用 Bearer Token。
- 优先使用：
  - `POST /auth/app/login`
  - `POST /auth/app/register/complete`
  - `POST /auth/app/refresh`
  - `GET /auth/app/current-user`
  - `POST /auth/app/logout`

### 3.3 登录流程

标准顺序：

1. `POST /auth/captcha/challenge`
2. `POST /auth/sms/request`
3. `POST /auth/app/login`
4. 若返回 `registration_required`
   进入补全资料流程
5. `POST /auth/app/register/complete`

## 4. 统一错误处理

### 4.1 常见认证错误

- `INVALID_CAPTCHA`
  图形验证码错误或已过期。
- `INVALID_SMS_CODE`
  短信验证码错误或已过期。
- `DISPLAY_NAME_TAKEN`
  用户名已被占用，应在输入框附近直接提示用户修改。
- `PHONE_ALREADY_REGISTERED`
  手机号已存在，应引导用户改为登录而不是继续注册。
- `INVALID_REGISTRATION_TOKEN`
  注册补全过程失效，应让用户回到登录页重新获取。

### 4.2 前端处理建议

- 不要只显示通用错误弹窗。
- 优先做字段级提示：
  - 用户名重复
  - 手机号格式错误
  - 图形验证码错误
  - 短信验证码错误
- 无法归类的错误，再回退到页面级错误提示。

## 5. 上传约定

所有图片 / 视频上传统一走三段式流程：

1. `POST /uploads/init`
2. 客户端直传对象存储
3. `POST /uploads/complete`

前端应封装统一上传器，而不是每个页面单独拼流程。

### 5.1 推荐前端上传能力拆分

- `uploadImage(file, bizType)`
- `uploadVideo(file, bizType)`
- `uploadAvatar(file)`
- `uploadCover(file)`
- `uploadReportImage(file)`

### 5.2 当前常用业务类型

- `avatar-image`
- `post-image`
- `post-video`
- `aircraft-cover-image`
- `aircraft-video`
- `ranking-cover-image`
- `ranking-item-image`
- `report-image`

## 6. 页面与接口映射

### 6.1 首页

- `GET /home/feed`
- `GET /rankings`
- `GET /models`

### 6.2 飞友圈

- `GET /circle/feed`
- `GET /posts/{id}`
- `POST /posts/{id}/interact`
- `POST /posts/{id}/comments`
- `PUT /posts/{id}/comments/{commentId}`
- `DELETE /posts/{id}/comments/{commentId}`

### 6.3 飞行器库

- `GET /models`
- `GET /models/{slug}`
- `GET /models/{slug}/comments`
- `POST /models/{slug}/comments`
- `POST /models/{slug}/interact`

### 6.4 榜单

- `GET /rankings`
- `GET /rankings/{id}`
- `GET /rating-targets/{id}`
- `POST /rankings`
- `PUT /rankings/{id}`
- `POST /rankings/{id}/items`

### 6.5 投稿与申请

- `POST /submissions`
- `PUT /submissions/{id}`
- `GET /submissions/{id}`
- `POST /brand-applications`
- `PUT /brand-applications/{id}`
- `GET /brand-applications/{id}`

### 6.6 用户与设置

- `GET /users/{userId}`
- `GET /users/{userId}/content`
- `GET /users/me/profile`
- `PUT /users/me/profile`
- `POST /users/{userId}/follow`
- `GET /social/notifications`
- `POST /social/notifications/read-all`

## 7. 需要特别注意的字段

### 7.1 当前用户资料

`CurrentUserProfileResponse.item` 已包含：

- `displayName`
- `bio`
- `avatarFileId`
- `avatarUrl`
- `coverImageFileId`
- `coverImageUrl`
- `phone`
- `phoneMasked`
- `profileVisibility`
- 通知开关字段

移动端 / 小程序可以直接据此完成“个人资料编辑页”。

### 7.2 飞行器状态

机型列表 / 详情 / 投稿已统一支持 `lifecycleStatus`，可选值为：

- `concept`
- `development`
- `testing`
- `unreleased`
- `released`
- `not_in_market`
- `marketed`

前端展示时建议统一映射：

- `concept` → `概念`
- `development` → `研发`
- `testing` → `测试`
- `unreleased` → `未发布`
- `released` → `已发布`
- `not_in_market` → `未上市`
- `marketed` → `已上市`

## 8. 评论区实现建议

当前帖子、机型、评分对象评论区都支持两种排序视图：

- `最新`
- `热门`

建议前端统一实现评论排序头部组件，避免各页面重复开发。

排序策略建议：

- `最新`
  按 `createdAt` 倒序
- `热门`
  按 `likeCount` 与回复数加权，再按时间倒序打平

## 9. 开发建议

- 先按 OpenAPI 标签拆前端 service 模块，不要按页面散落封装。
- 所有上传统一封装。
- 所有评论区统一抽象：
  - 评论列表
  - 回复
  - 点赞
  - 举报
  - 排序
- 将错误码映射放到单独模块维护。
- 页面层只负责：
  - 触发请求
  - 绑定状态
  - 展示错误

## 10. 推荐开发顺序

1. 登录与注册补全
2. 首页 / 飞友圈
3. 飞行器库与详情
4. 榜单与评分对象
5. 发布中心
6. 个人中心 / 设置 / 通知

## 11. 交付物建议

如果你要基于当前 OpenAPI 开发移动端 / 微信小程序，推荐先准备：

- 接口常量层
- 鉴权层
- 上传层
- 错误码映射层
- 评论通用组件
- 发布通用表单组件

这样后续页面开发会快很多。
