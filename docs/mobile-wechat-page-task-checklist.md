# 移动端 / 微信小程序页面开发任务清单

> 配套文档：
> - [OpenAPI 前端对接指南](/E:/CodeStore/feijia/docs/openapi-frontend-integration-guide.md)
> - [移动端 / 微信小程序前端开发文档](/E:/CodeStore/feijia/docs/mobile-wechat-frontend-dev-guide.md)
> - Swagger UI：`/docs`
> - OpenAPI JSON：`/openapi.json`

## 1. 使用方式

本文档按“页面 = 一个开发单元”的方式拆解，适合直接用于：

- 排期
- 拆分前端任务
- 编写迭代清单
- 自测验收

每个页面统一拆成：

- 目标
- 接口
- 组件
- 状态
- 交互
- 验收点

## 2. 全局基础任务

在开始页面开发前，建议先完成以下基础模块：

### 2.1 网络层

- 统一请求封装
- Bearer Token 注入
- 401 / 403 / 409 错误统一处理
- 请求取消与重复请求保护

### 2.2 认证层

- Access Token 持久化
- Refresh Token 持久化
- 启动时自动恢复会话
- 登录失效自动跳转

### 2.3 上传层

- 图片上传封装
- 视频上传封装
- 上传进度状态
- 上传失败重试

### 2.4 错误码映射层

- `INVALID_CAPTCHA`
- `INVALID_SMS_CODE`
- `DISPLAY_NAME_TAKEN`
- `PHONE_ALREADY_REGISTERED`
- `INVALID_REGISTRATION_TOKEN`

### 2.5 通用 UI

- 页面容器
- 顶部导航栏
- 标签切换组件
- 卡片组件
- 评论输入组件
- 评论排序头部组件
- 空状态组件
- 错误状态组件
- 上传占位组件

## 3. 启动与认证

### 3.1 启动页

目标：

- 检查本地会话
- 自动决定进入首页还是登录页

接口：

- `POST /auth/app/refresh`
- `GET /auth/app/current-user`

状态：

- `isBootstrapping`
- `accessToken`
- `refreshToken`
- `currentUser`

交互：

- 启动中显示品牌页
- 刷新成功进入首页
- 刷新失败清空本地令牌

验收点：

- 已登录用户重启应用不需要重新登录
- 失效令牌不会导致白屏

### 3.2 登录页

目标：

- 通过手机号 + 图形验证码 + 短信验证码登录

接口：

- `POST /auth/captcha/challenge`
- `POST /auth/sms/request`
- `POST /auth/app/login`

组件：

- 手机号输入框
- 图形验证码组件
- 短信验证码输入框
- 获取验证码按钮
- 登录按钮

状态：

- `phone`
- `captchaChallenge`
- `captchaCode`
- `smsCode`
- `cooldownSeconds`
- `submitError`

交互：

- 页面打开自动拉取图形验证码
- 点击验证码可刷新
- 获取短信验证码前必须先填手机号和图形验证码
- 登录成功后判断是已注册还是待补全资料

验收点：

- 图形验证码错误时给出明确提示
- 短信验证码错误时给出明确提示
- 新用户能进入补全资料页

### 3.3 注册补全页

目标：

- 完成首次登录用户的昵称与头像补全

接口：

- `POST /auth/app/register/complete`
- 上传接口三段式流程

组件：

- 头像上传区
- 用户名输入框
- 完成注册按钮

状态：

- `registrationToken`
- `displayName`
- `displayNameError`
- `avatarFileId`
- `avatarPreview`

交互：

- 用户名重复时字段级提示
- 头像可跳过
- 完成后进入首页

验收点：

- `DISPLAY_NAME_TAKEN` 不会被通用错误覆盖
- 头像上传成功后能带入注册完成请求

## 4. 首页

### 4.1 首页 Feed 页

目标：

- 承接推荐内容、热门榜单、热门机型与搜索入口

接口：

- `GET /home/feed`
- `GET /rankings`
- `GET /models`

组件：

- 顶部搜索框
- 推荐 / 最新 / 关注切换
- 内容流卡片
- 热门榜单卡片
- 热门机型卡片

状态：

- `homeTab`
- `feedItems`
- `rankingCards`
- `hotModels`

交互：

- Tab 切换刷新 Feed
- 点击内容卡跳详情
- 点击热门机型跳飞行器详情

验收点：

- 热门机型卡片显示点赞数与评论数
- 不显示旧的测评数文案

## 5. 飞友圈

### 5.1 飞友圈流页

目标：

- 承接动态列表与详情入口

接口：

- `GET /circle/feed`

组件：

- Tab 切换
- 瀑布流卡片
- 视频角标

状态：

- `activeTab`
- `feedItems`

交互：

- 推荐 / 最新 / 关注切换
- 点击卡片进入详情

### 5.2 动态详情页

目标：

- 展示动态正文、互动区与评论区

接口：

- `GET /posts/{id}`
- `POST /posts/{id}/comments`
- `POST /posts/{id}/interact`

组件：

- 详情头部
- 媒体轮播
- 互动条
- 评论输入框
- 评论排序切换
- 评论列表

状态：

- `commentSort`
- `commentDraft`
- `isSubmittingComment`

交互：

- 评论排序支持 `最新 / 热门`
- 默认 `最新`

验收点：

- 评论区排序切换立即生效
- 未登录互动统一弹登录引导

## 6. 飞行器库

### 6.1 飞行器列表页

目标：

- 展示机型列表与筛选能力

接口：

- `GET /models`
- `GET /brands`
- `GET /aircraft-categories`

组件：

- 搜索框
- 筛选抽屉
- 机型卡片

状态：

- `keyword`
- `categorySlugs`
- `brandSlugs`
- `powerTypes`

交互：

- 移动端筛选放抽屉，不做 Web 右栏
- 列表卡片点击进入详情

### 6.2 飞行器详情页

目标：

- 展示机型详情、参数、互动和评论

接口：

- `GET /models/{slug}`
- `GET /models/{slug}/comments`
- `POST /models/{slug}/comments`
- `POST /models/{slug}/interact`

组件：

- 轮播图
- 标题区
- 参数区
- 互动区
- 评论区

状态：

- `commentSort`
- `commentDraft`

交互：

- 评论区支持 `最新 / 热门`
- 默认 `最新`

验收点：

- 状态字段显示为：
  - 概念
  - 研发
  - 测试
  - 未发布
  - 已发布
  - 未上市
  - 已上市

## 7. 榜单

### 7.1 榜单列表页

目标：

- 展示官方 / 社区榜单

接口：

- `GET /rankings`

组件：

- 榜单卡片
- 榜单分类切换

### 7.2 榜单详情页

目标：

- 展示榜单信息和排行对象列表

接口：

- `GET /rankings/{id}`
- `POST /rankings/{id}/comments`

组件：

- 榜单封面
- 标题简介
- 排行对象列表
- 评论区

### 7.3 评分对象详情页

目标：

- 展示排行对象详情、评分与评论

接口：

- `GET /rating-targets/{id}`
- `POST /rating-targets/{id}/comments`
- `POST /rating-targets/{id}/ratings`
- `POST /rating-targets/{id}/reviews`

组件：

- 头图
- 评分总览
- 评论输入
- 评论排序头部
- 评论列表

状态：

- `commentSort`
- `selectedRating`
- `commentDraft`

交互：

- 评论区支持 `最新 / 热门`
- 默认 `最新`

## 8. 发布中心

### 8.1 发布中心页

目标：

- 统一承接文章 / 动态 / 飞行器 / 品牌 / 榜单发布入口

接口：

- 无直接核心接口，主要做路由跳转

### 8.2 发布文章页

接口：

- `POST /posts`
- `PUT /posts/{id}`
- 上传接口

规则：

- 摘要 100 字
- 摘要禁拖拽
- 封面点击大框上传
- 富文本工具栏一排排列

### 8.3 发布动态页

接口：

- `POST /posts`
- `PUT /posts/{id}`
- 上传接口

规则：

- 图片张数不再限制 6 张
- 图片 / 视频不可混发

### 8.4 发布飞行器页

接口：

- `POST /submissions`
- `PUT /submissions/{id}`
- `GET /brands`
- `GET /aircraft-categories`

规则：

- 品牌只能从已有品牌选择
- 不再提供“申请品牌”入口
- 一句话摘要 50 字
- 长描述 300 字
- 两个输入区禁拖拽
- 封面点击大框上传
- 状态字段必选

页面任务：

- 分类选择
- 品牌检索与选择
- 动力选择
- 状态选择
- 封面上传
- 参数输入
- 摘要 / 描述输入
- 预览信息同步

### 8.5 申请品牌页

接口：

- `POST /brand-applications`
- `PUT /brand-applications/{id}`
- 上传接口

规则：

- 左侧 Logo 可选点击上传
- 品牌名必填
- slug 必填且手输英文
- 描述 500 字
- 描述禁拖拽
- logo 可空，其余必填

### 8.6 创建榜单页

接口：

- `POST /rankings`
- `PUT /rankings/{id}`
- `GET /models`
- 上传接口

规则：

- 榜单主封面无默认图
- 点击封面区上传
- “添加排行对象”统一文案
- 飞行器库候选区内部滚动

## 9. 用户与设置

### 9.1 我的首页

目标：

- 展示个人快捷入口

组件：

- 个人头部卡
- 通知入口
- 设置入口
- 我的内容入口

### 9.2 个人主页

接口：

- `GET /users/{userId}`
- `GET /users/{userId}/content`
- `GET /users/me/profile`

组件：

- 封面图
- 头像
- 用户名
- 标签
- 个人简介
- 内容列表

### 9.3 设置页

接口：

- `GET /users/me/profile`
- `PUT /users/me/profile`
- `POST /users/me/phone/change/request`
- `POST /users/me/phone/change/confirm`

任务：

- 头像编辑
- 封面图编辑
- 昵称编辑
- 简介编辑
- 可见范围编辑
- 手机号换绑弹窗
- 通知开关

### 9.4 通知页

接口：

- `GET /social/notifications`
- `POST /social/notifications/read-all`
- `POST /social/notifications/{id}/read`

任务：

- 通知列表
- 批量已读
- 单条已读
- 跳转对应详情页

## 10. 评论系统统一开发任务

每个评论区统一拆成：

- 评论排序头部
- 根评论列表
- 回复列表
- 评论输入区
- 回复输入区
- 点赞
- 举报
- 编辑 / 删除

通用状态：

- `commentSort`
- `commentDraft`
- `replyDraft`
- `busyAction`
- `errorMessage`

## 11. 发布状态与文案映射

### 11.1 机型生命周期状态

前端必须统一映射：

- `concept` → `概念`
- `development` → `研发`
- `testing` → `测试`
- `unreleased` → `未发布`
- `released` → `已发布`
- `not_in_market` → `未上市`
- `marketed` → `已上市`

### 11.2 通用错误提示

- 用户名已占用
- 手机号已注册
- 图形验证码已过期
- 短信验证码错误
- 上传失败
- 提交失败

## 12. 建议排期拆分

### 第一阶段

- 登录
- 注册补全
- 首页

### 第二阶段

- 飞友圈
- 飞行器列表
- 飞行器详情

### 第三阶段

- 榜单列表
- 榜单详情
- 评分对象详情

### 第四阶段

- 发布文章
- 发布动态
- 发布飞行器
- 申请品牌
- 创建榜单

### 第五阶段

- 我的
- 设置
- 通知

## 13. 验收清单

- 所有页面都有空状态
- 所有页面都有错误状态
- 登录失效能自动回收
- 评论区都支持最新 / 热门
- 上传都走统一上传器
- 发布页文本输入都有字数限制与反馈
- 机型状态展示全端一致
- 品牌申请页 slug 为手输英文

## 14. 开发完成后的建议

完成基础开发后，建议你再补两类文档：

- 组件文档
- 状态流文档

这样后续做二期功能会轻松很多。
