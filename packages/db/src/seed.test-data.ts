/**
 * 飞加项目海量测试数据生成脚本
 *
 * 用途：向 PostgreSQL、Redis 和 MinIO 推送大量测试数据
 * 使用：bun run packages/db/src/seed.test-data.ts
 *
 * 数据规模：
 * - 用户：50 个
 * - 飞行器分类：6 个
 * - 品牌：20 个
 * - 飞行器型号：30 个
 * - 内容分类：5 个
 * - 帖子：60 个（文章 30 + 动态 30）
 * - 帖子评论：120 条
 * - 帖子互动：200 条
 * - 帖子举报：15 条
 * - 飞行器评测：40 条
 * - 飞行器型号评论：50 条
 * - 飞行器型号互动：80 条
 * - 排行榜：10 个
 * - 排行榜项目：50 个
 * - 排行榜评论：20 条
 * - 排行榜项目评分：100 条
 * - 排行榜项目评论：40 条
 * - 用户关注：80 条
 * - 通知：100 条
 * - 会话：30 个
 * - 飞行器提交：15 个
 * - 文件记录：80 个
 * - 各类举报：30 条
 */

import { createClient } from "redis";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelCommentsTable,
  aircraftModelInteractionsTable,
  aircraftModelsTable,
  aircraftReviewsTable,
  aircraftSubmissionsTable,
  brandsTable,
  contentCategoriesTable,
  filesTable,
  notificationsTable,
  postCommentLikesTable,
  postCommentReportsTable,
  postCommentsTable,
  postInteractionsTable,
  postReportsTable,
  postsTable,
  rankingCommentsTable,
  rankingReportsTable,
  rankingsTable,
  ratingTargetCommentsTable,
  ratingTargetCommentReportsTable,
  ratingTargetRatingsTable,
  ratingTargetReportsTable,
  ratingTargetsTable,
  sessionsTable,
  siteSettingsTable,
  userFollowsTable,
  userSettingsTable,
  usersTable
} from "./schema.js";
import { sql } from "drizzle-orm";

// ==================== 工具函数 ====================

function uid(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createSecretToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function seededDate(day: number, hour: number, minute = 0) {
  return new Date(Date.UTC(2026, 2, day, hour, minute, 0));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}


// ==================== 数据常量 ====================

const USER_IDS: string[] = [];
const USER_PHONES: string[] = [];
const USER_DISPLAY_NAMES = [
  "云端飞手", "航拍达人", "天空之眼", "飞行日记", "低空探索者",
  "无人机玩家", "航拍小能手", "飞行家老李", "空中摄影师", "旋翼爱好者",
  "穿越机少年", "航模达人", "飞行俱乐部", "天际线飞行", "云端漫步者",
  "低空经济观察", "飞行测试员", "航拍工作室", "无人机评测", "飞行训练师",
  "天空摄影师", "航拍爱好者", "飞行器收藏家", "飞行日志", "低空飞行圈",
  "航模俱乐部", "飞行体验官", "无人机教练", "航拍旅行家", "飞行工程师",
  "天空记录者", "飞行探索者", "航拍大师", "无人机研究员", "飞行爱好者联盟",
  "低空旅游达人", "飞行器测评师", "航拍摄影师", "飞行安全官", "无人机维修师",
  "飞行数据分析师", "航拍剪辑师", "飞行器设计师", "飞行模拟器玩家", "低空法规研究员",
  "无人机赛事解说", "飞行气象员", "航拍后期师", "飞行器试飞员", "低空交通规划师",
];

const CATEGORY_IDS: string[] = [];
const CATEGORY_DATA = [
  { slug: "multirotor", name: "多旋翼" },
  { slug: "fixed-wing", name: "固定翼" },
  { slug: "evtol", name: "电动垂直起降" },
  { slug: "helicopter", name: "直升机" },
  { slug: "business-jet", name: "公务机" },
  { slug: "vtol", name: "垂直起降固定翼" },
];

const BRAND_IDS: string[] = [];
const BRAND_DATA = [
  { slug: "dji", name: "DJI 大疆", categoryIdx: 0 },
  { slug: "autel", name: "Autel 道通", categoryIdx: 0 },
  { slug: "hubsan", name: "Hubsan 哈博森", categoryIdx: 0 },
  { slug: "fimi", name: "FIMI 飞米", categoryIdx: 0 },
  { slug: "potensic", name: "Potensic", categoryIdx: 0 },
  { slug: "ehang", name: "EHang 亿航", categoryIdx: 2 },
  { slug: "joby", name: "Joby Aviation", categoryIdx: 2 },
  { slug: "volocopter", name: "Volocopter", categoryIdx: 2 },
  { slug: "lilium", name: "Lilium", categoryIdx: 2 },
  { slug: "archer", name: "Archer Aviation", categoryIdx: 2 },
  { slug: "robinson", name: "Robinson 罗宾逊", categoryIdx: 3 },
  { slug: "airbus-heli", name: "Airbus Helicopters", categoryIdx: 3 },
  { slug: "bell", name: "Bell 贝尔", categoryIdx: 3 },
  { slug: "cirrus", name: "Cirrus 西锐", categoryIdx: 4 },
  { slug: "embraer", name: "Embraer 巴航工业", categoryIdx: 4 },
  { slug: "textron", name: "Textron Aviation", categoryIdx: 4 },
  { slug: "xpeng-aero", name: "小鹏汇天", categoryIdx: 2 },
  { slug: "auto-flight", name: "峰飞航空", categoryIdx: 5 },
  { slug: "tcab", name: "TCAB 太力", categoryIdx: 5 },
  { slug: "vertical", name: "Vertical Aerospace", categoryIdx: 2 },
];

const MODEL_IDS: string[] = [];
const MODEL_DATA = [
  { slug: "mini-4-pro", name: "DJI Mini 4 Pro", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 4999, priceMax: 6999, flight: 45, range: 18, speed: 58, weight: 249 },
  { slug: "mavic-3-pro", name: "DJI Mavic 3 Pro", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 13888, priceMax: 17688, flight: 43, range: 28, speed: 75, weight: 958 },
  { slug: "air-3", name: "DJI Air 3", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 6988, priceMax: 9988, flight: 46, range: 20, speed: 68, weight: 720 },
  { slug: "inspire-3", name: "DJI Inspire 3", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 109999, priceMax: 139999, flight: 28, range: 15, speed: 94, weight: 3995 },
  { slug: "matrice-350", name: "DJI Matrice 350 RTK", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 59999, priceMax: 79999, flight: 55, range: 20, speed: 82, weight: 6300 },
  { slug: "evo-lite-plus", name: "Autel EVO Lite+", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 7299, priceMax: 8599, flight: 40, range: 24, speed: 68, weight: 835 },
  { slug: "evo-nano-plus", name: "Autel EVO Nano+", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 4299, priceMax: 5499, flight: 28, range: 16, speed: 54, weight: 249 },
  { slug: "evo-max-4t", name: "Autel EVO Max 4T", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 49999, priceMax: 69999, flight: 42, range: 20, speed: 72, weight: 1150 },
  { slug: "zino-mini-pro", name: "Hubsan Zino Mini Pro", brandIdx: 2, catIdx: 0, power: "electric", priceMin: 2999, priceMax: 3999, flight: 40, range: 10, speed: 56, weight: 249 },
  { slug: "zino-plus", name: "Hubsan Zino Plus SE", brandIdx: 2, catIdx: 0, power: "electric", priceMin: 3499, priceMax: 4499, flight: 30, range: 9, speed: 60, weight: 595 },
  { slug: "fimi-x8se", name: "FIMI X8 SE 2022", brandIdx: 3, catIdx: 0, power: "electric", priceMin: 3999, priceMax: 5499, flight: 35, range: 12, speed: 65, weight: 795 },
  { slug: "fimi-palm-2", name: "FIMI Palm 2", brandIdx: 3, catIdx: 0, power: "electric", priceMin: 1999, priceMax: 2499, flight: 0, range: 0, speed: 0, weight: 125 },
  { slug: "potensic-atom", name: "Potensic Atom", brandIdx: 4, catIdx: 0, power: "electric", priceMin: 1999, priceMax: 2999, flight: 31, range: 4, speed: 50, weight: 374 },
  { slug: "eh216-s", name: "EHang EH216-S", brandIdx: 5, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 25, range: 35, speed: 130, weight: null },
  { slug: "eh2160", name: "EHang EH2160", brandIdx: 5, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 30, range: 50, speed: 150, weight: null },
  { slug: "joby-s4", name: "Joby S4", brandIdx: 6, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 45, range: 240, speed: 320, weight: null },
  { slug: "voloconnect", name: "Volocopter VoloConnect", brandIdx: 7, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 80, speed: 180, weight: null },
  { slug: "lilium-jet", name: "Lilium Jet", brandIdx: 8, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 60, range: 300, speed: 280, weight: null },
  { slug: "archer-midnight", name: "Archer Midnight", brandIdx: 9, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 96, speed: 240, weight: null },
  { slug: "r44", name: "Robinson R44", brandIdx: 10, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 560, speed: 220, weight: null },
  { slug: "r66", name: "Robinson R66", brandIdx: 10, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 150, range: 600, speed: 240, weight: null },
  { slug: "h145", name: "Airbus H145", brandIdx: 11, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 680, speed: 280, weight: null },
  { slug: "bell-505", name: "Bell 505 Jet Ranger", brandIdx: 12, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 165, range: 540, speed: 230, weight: null },
  { slug: "vision-jet", name: "Cirrus Vision Jet G2+", brandIdx: 13, catIdx: 4, power: "fuel", priceMin: null, priceMax: null, flight: 300, range: 2300, speed: 576, weight: null },
  { slug: "phenom-300e", name: "Embraer Phenom 300E", brandIdx: 14, catIdx: 4, power: "fuel", priceMin: null, priceMax: null, flight: 240, range: 3700, speed: 860, weight: null },
  { slug: "xpeng-x3", name: "小鹏汇天陆地航母", brandIdx: 16, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 30, range: 50, speed: 130, weight: null },
  { slug: "autoflight-prosperity", name: "峰飞盛世龙", brandIdx: 17, catIdx: 5, power: "electric", priceMin: null, priceMax: null, flight: 45, range: 250, speed: 200, weight: null },
  { slug: "tcab-transition", name: "太力 Transition", brandIdx: 18, catIdx: 5, power: "fuel", priceMin: null, priceMax: null, flight: 120, range: 800, speed: 180, weight: null },
  { slug: "va-x4", name: "Vertical VA-X4", brandIdx: 19, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 40, range: 160, speed: 320, weight: null },
  { slug: "dji-agras-t50", name: "DJI Agras T50", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 69999, priceMax: 89999, flight: 20, range: 5, speed: 36, weight: 40000 },
];

const CONTENT_CAT_IDS: string[] = [];
const CONTENT_CAT_DATA = [
  { slug: "news", name: "资讯" },
  { slug: "review", name: "评测" },
  { slug: "aerial", name: "航拍" },
  { slug: "tech", name: "技术" },
  { slug: "guide", name: "指南" },
];

const ARTICLE_TITLES = [
  "2026 年低空经济发展趋势分析",
  "DJI Mini 4 Pro 深度评测：轻巧与性能的完美平衡",
  "航拍技巧分享：如何在城市中找到最佳拍摄点",
  "eVTOL 飞行器技术路线对比",
  "无人机电池保养指南：延长使用寿命的 10 个技巧",
  "低空旅游新体验：从空中看世界的不同角度",
  "穿越机入门：从零基础到第一次 FPV 飞行",
  "2026 春季航拍目的地推荐",
  "无人机法规更新：2026 年最新飞行规定解读",
  "农业无人机应用案例分析",
  "航拍后期处理工作流分享",
  "多旋翼 vs 固定翼：如何选择适合你的飞行器",
  "低空经济产业链全景图",
  "无人机在应急救援中的应用",
  "如何考取无人机驾驶执照",
  "航拍构图技巧：让照片更有故事感",
  "飞行器传感器技术解析",
  "无人机集群表演背后的技术原理",
  "城市空中交通（UAM）发展展望",
  "无人机保险购买指南",
  "航拍延时摄影拍摄技巧",
  "飞行器空气动力学基础",
  "无人机在影视制作中的应用",
  "低空空域管理改革进展",
  "无人机物流配送商业化探索",
  "航拍滤镜选择与使用技巧",
  "飞行器导航系统对比：GPS vs 北斗",
  "无人机在电力巡检中的应用",
  "航拍视频剪辑入门教程",
  "飞行器通信技术：图传系统解析",
];

const MOMENT_TITLES = [
  "今日飞行记录",
  "周末航拍打卡",
  "新入手的飞行器首飞",
  "夕阳下的城市天际线",
  "山谷飞行体验",
  "海边航拍日记",
  "夜间飞行测试",
  "春季花海航拍",
  "雪山航拍挑战",
  "城市夜景航拍",
  "森林航拍探险",
  "湖泊航拍记录",
  "田野航拍随拍",
  "桥梁航拍特写",
  "港口航拍日志",
];

const REVIEW_CONTENTS = [
  "这款飞行器表现非常出色，操控稳定，画质清晰，非常适合日常使用。",
  "续航能力令人满意，在实际测试中达到了官方标称的时间。",
  "图传系统稳定，在城市环境中也能保持较好的信号质量。",
  "便携性很好，折叠后体积小巧，方便携带出行。",
  "智能飞行功能丰富，跟随模式和航点飞行都很实用。",
  "画质表现优秀，4K 视频细节丰富，色彩还原准确。",
  "抗风能力不错，在 5 级风环境下依然能稳定飞行。",
  "噪音控制做得很好，相比前代产品有明显改善。",
  "避障系统灵敏，在复杂环境中能有效避免碰撞。",
  "性价比很高，同价位产品中配置最为均衡。",
  "适合新手入门，操作简单易上手，安全功能完善。",
  "专业功能丰富，满足商业航拍的各种需求。",
  "电池充电速度快，支持快充，提高了使用效率。",
  "遥控器手感好，屏幕亮度充足，户外可视性佳。",
  "APP 界面友好，功能布局合理，操作流畅。",
];

const COMMENT_CONTENTS = [
  "写得很好，学到了不少东西！",
  "感谢分享，非常实用的内容。",
  "请问这个技巧在山区也适用吗？",
  "期待更多类似的评测文章。",
  "已经入手了同款，确实不错。",
  "有没有更详细的参数对比？",
  "这个价格性价比很高了。",
  "飞控稳定性如何？",
  "续航实测数据能分享一下吗？",
  "新手推荐买哪款？",
  "画质确实很棒，色彩很正。",
  "抗风性能测试过吗？",
  "图传距离实测多少？",
  "有没有夜间飞行经验？",
  "这个功能很实用，之前不知道。",
  "支持一下，继续更新！",
  "收藏了，慢慢看。",
  "请问电池能通用吗？",
  "维修成本高不高？",
  "有没有推荐的配件？",
];

const RANKING_TITLES = [
  "2026 年度最佳航拍无人机排行",
  "入门级无人机推荐榜",
  "eVTOL 飞行器技术实力榜",
  "专业级航拍设备排行",
  "最具性价比无人机排行",
  "长续航飞行器排行",
  "便携无人机精选榜",
  "行业应用无人机排行",
  "穿越机性能排行",
  "低空出行飞行器展望榜",
];

const RANKING_DESCS = [
  "综合画质、续航、便携性等多维度評选出的年度最佳航拍无人机",
  "适合新手入门的高性价比无人机推荐",
  "基于技术参数和试飞数据的 eVTOL 飞行器排名",
  "面向专业摄影师和影视制作团队的高端设备排行",
  "在性能和价格之间取得最佳平衡的无人机推荐",
  "续航能力最强的飞行器排行，适合长距离任务",
  "折叠后体积最小、重量最轻的便携无人机精选",
  "在农业、巡检、测绘等行业应用中的优秀无人机",
  "速度和操控性能最强的穿越机排行",
  "未来低空出行领域最具潜力的飞行器展望",
];

const RANKING_ITEM_TITLES = [
  "综合表现优秀，各项指标均衡",
  "画质出众，专业级影像系统",
  "续航能力强，适合长距离飞行",
  "便携性极佳，旅行必备",
  "性价比高，入门首选",
  "智能功能丰富，操作便捷",
  "抗风性能出色，适应复杂环境",
  "图传稳定，信号覆盖广",
  "噪音低，适合城市飞行",
  "载重能力强，适合行业应用",
];

const SUBMISSION_NAMES = [
  "新型农业植保无人机",
  "城市物流配送飞行器",
  "应急救援无人机",
  "电力巡检专用无人机",
  "测绘建模飞行器",
  "消防灭火无人机",
  "海洋监测飞行器",
  "森林防火巡逻机",
  "交通监控无人机",
  "环境监测飞行器",
  "快递配送多旋翼",
  "医疗物资运输机",
  "建筑工地巡检无人机",
  "景区观光飞行器",
  "通信中继无人机",
];

const REPORT_REASONS = [
  "内容不相关",
  "虚假信息",
  "不当言论",
  "侵犯版权",
  "广告推广",
  "恶意攻击",
  "重复发布",
  "违规内容",
];

const BIO_TEXTS = [
  "热爱航拍的飞友，记录每一次飞行",
  "无人机爱好者，分享飞行经验",
  "专业航拍师，用镜头记录世界",
  "低空经济研究者，关注行业发展",
  "FPV 穿越机玩家，追求速度与激情",
  "飞行器收藏家，收集各种机型",
  "航拍旅行家，用飞行探索世界",
  "无人机教练，培养更多飞手",
  "飞行器测评师，客观公正评测",
  "低空旅游达人，分享飞行体验",
  "航拍后期师，让照片更有故事",
  "飞行器试飞员，体验每一款新机",
  "无人机赛事选手，追求极限操控",
  "航拍工作室主理人",
  "低空法规研究员，推动行业发展",
];

const FILE_KEYS: string[] = [];

// ==================== MinIO ====================

async function seedMinIO() {
  console.log("\n📦 开始推送 MinIO 测试数据...");

  const client = new S3Client({
    region: process.env.STORAGE_REGION?.trim() || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT?.trim() || "http://localhost:9000",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID?.trim() || "minioadmin",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY?.trim() || "minioadmin123",
    },
    forcePathStyle: true,
  });

  const bucket = process.env.STORAGE_BUCKET?.trim() || "feijia-media";
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`  ✓ Bucket "${bucket}" 已存在`);
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`  ✓ 创建 Bucket "${bucket}"`);
  }

  const ONE_PIXEL_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO1f4f8AAAAASUVORK5CYII=",
    "base64"
  );
  const TINY_MP4 = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]);

  const categories = [
    { prefix: "avatars", count: 50, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "posts/articles", count: 30, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "posts/moments", count: 30, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "posts/videos", count: 10, type: "video/mp4" as const, data: TINY_MP4 },
    { prefix: "rankings/covers", count: 10, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "rankings/items", count: 50, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "models/covers", count: 30, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "submissions/covers", count: 15, type: "image/png" as const, data: ONE_PIXEL_PNG },
    { prefix: "reports/evidence", count: 10, type: "image/png" as const, data: ONE_PIXEL_PNG },
  ];

  let total = 0;
  for (const cat of categories) {
    for (let i = 0; i < cat.count; i++) {
      const key = `test/${cat.prefix}/${cat.prefix.split("/").pop()}-${String(i + 1).padStart(3, "0")}.${cat.type === "video/mp4" ? "mp4" : "png"}`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: cat.data,
          ContentType: cat.type,
          CacheControl: "public, max-age=86400",
          Metadata: { seed: "test-data" },
        })
      );
      FILE_KEYS.push(key);
      total++;
    }
  }

  console.log(`  ✅ MinIO 推送完成，共 ${total} 个文件`);
}

// ==================== Redis ====================

async function seedRedis() {
  console.log("\n🗄️ 开始推送 Redis 测试数据...");

  const client = createClient({
    url: process.env.REDIS_URL?.trim() || "redis://localhost:6379/0",
  });
  await client.connect();

  try {
    // 验证码
    await client.set("captcha:test_captcha_001", JSON.stringify({ challengeId: "test_captcha_001", code: "TEST01" }), { EX: 300 });
    await client.set("captcha:test_captcha_002", JSON.stringify({ challengeId: "test_captcha_002", code: "ABCD" }), { EX: 300 });
    console.log("  ✓ 图形验证码: 2 组");

    // 短信验证码
    await client.set("sms:13800138000", JSON.stringify({ requestId: "test_sms_001", phone: "13800138000", code: "888888" }), { EX: 300 });
    await client.set("sms:13800138001", JSON.stringify({ requestId: "test_sms_002", phone: "13800138001", code: "666666" }), { EX: 300 });
    console.log("  ✓ 短信验证码: 2 组");

    // 待注册
    await client.set("reg:test_reg_001", JSON.stringify({
      registrationToken: "test_reg_001", phone: "13900139000",
      suggestedDisplayName: "新飞友", clientIp: "127.0.0.1", userAgent: "TestApp/1.0", deviceLabel: "Test Device",
    }), { EX: 600 });
    console.log("  ✓ 待注册令牌: 1 组");

    // 热门缓存
    await client.set("feed:hot-circle", JSON.stringify(
      Array.from({ length: 12 }, (_, i) => ({
        id: `circle-${i + 1}`, title: pick(["dawn-training", "harbor-route", "mavic-review", "autel-canyon", "endurance-board", "delta-checkin", "grassland-log", "ranking-3d", "mini-qa", "night-show", "custom-ranking", "joby-note"]),
        mediaPath: FILE_KEYS[i % FILE_KEYS.length], heat: 100 - i * 7,
      }))
    ));
    await client.set("feed:hot-models", JSON.stringify(
      MODEL_DATA.slice(0, 10).map((m, i) => ({ slug: m.slug, name: m.name, heat: 98 - i * 5 }))
    ));
    await client.set("feed:hot-rankings", JSON.stringify(
      Array.from({ length: 5 }, (_, i) => ({ id: `ranking-${i + 1}`, title: RANKING_TITLES[i], heat: 95 - i * 8 }))
    ));
    await client.set("feed:hero-media", JSON.stringify(
      FILE_KEYS.slice(0, 5).map((k, i) => ({ id: `hero-${i + 1}`, path: k, url: "" }))
    ));
    console.log("  ✓ 热门缓存: 4 组");

    console.log("  ✅ Redis 推送完成");
  } finally {
    await client.disconnect();
  }
}

// ==================== PostgreSQL ====================

async function seedPostgreSQL() {
  console.log("\n🐘 开始推送 PostgreSQL 测试数据...");

  console.log("  🧹 清理已有测试数据...");
  await db.execute(sql.raw(
    `TRUNCATE TABLE "rating_target_comment_likes", "rating_target_comments", "rating_target_comment_reports",
      "rating_target_ratings", "rating_target_reports", "rating_targets", "ranking_comment_likes",
      "ranking_comments", "ranking_comment_reports", "ranking_reports", "rankings",
      "post_comment_likes", "post_comment_reports", "post_comments", "post_interactions",
      "post_reports", "posts", "aircraft_model_comment_likes", "aircraft_model_comments",
      "aircraft_model_comment_reports", "aircraft_model_interactions", "aircraft_model_reports",
      "aircraft_reviews", "aircraft_review_likes", "aircraft_review_reports",
      "aircraft_submissions", "brand_applications", "aircraft_models", "brands",
      "content_categories", "aircraft_categories", "files", "user_follows",
      "notifications", "user_settings", "sessions", "users"
      RESTART IDENTITY CASCADE;`
  ));
  console.log("  ✓ 清理完成");

  // 1. 用户 (50)
  console.log("  👥 创建 50 个用户...");
  const adminPasswordHash = await hashPassword("TestAdmin#123");
  const users = [
    { id: uid("user"), role: "admin" as const, displayName: "系统管理员", phone: null, account: "testadmin", passwordHash: adminPasswordHash, avatarFileId: null, bio: null },
    ...USER_DISPLAY_NAMES.map((name) => ({
      id: uid("user"), role: "user" as const, displayName: name,
      phone: `138${String(10000000 + randInt(1000000, 9999999)).slice(0, 8)}`,
      account: null, passwordHash: null,
      avatarFileId: null, bio: pick(BIO_TEXTS),
    })),
  ];
  // 确保手机号唯一
  const usedPhones = new Set<string>();
  for (const u of users) {
    if (u.phone) {
      while (usedPhones.has(u.phone)) {
        u.phone = `138${String(10000000 + randInt(1000000, 9999999)).slice(0, 8)}`;
      }
      usedPhones.add(u.phone);
      USER_PHONES.push(u.phone);
    }
    USER_IDS.push(u.id);
  }

  await db.insert(usersTable).values(users);
  console.log(`  ✓ 用户: ${users.length} 个 (管理员 1 + 普通用户 ${users.length - 1})`);

  // 2. 用户设置
  console.log("  ⚙️ 创建用户设置...");
  const adminId = USER_IDS[0];
  const regularUsers = USER_IDS.slice(1);
  await db.insert(userSettingsTable).values(
    regularUsers.slice(0, 30).map((userId) => ({
      id: uid("setting"), userId,
      profileVisibility: pick(["public", "community", "private"]),
      notifyComments: Math.random() > 0.3,
      notifyMentions: Math.random() > 0.4,
      sessionAlerts: Math.random() > 0.2,
      emailDigest: Math.random() > 0.7,
    }))
  );
  console.log("  ✓ 用户设置: 30 个");

  // 3. 飞行器分类 (6)
  console.log("  📂 创建飞行器分类...");
  for (const c of CATEGORY_DATA) {
    const id = uid("cat");
    CATEGORY_IDS.push(id);
    await db.insert(aircraftCategoriesTable).values({ id, slug: c.slug, name: c.name, sortOrder: CATEGORY_DATA.indexOf(c) + 1 });
  }
  console.log(`  ✓ 分类: ${CATEGORY_IDS.length} 个`);

  // 4. 品牌 (20)
  console.log("  🏷️ 创建品牌...");
  for (const b of BRAND_DATA) {
    const id = uid("brand");
    BRAND_IDS.push(id);
    await db.insert(brandsTable).values({
      id, slug: b.slug, name: b.name,
      categoryId: CATEGORY_IDS[b.categoryIdx],
      sortOrder: BRAND_DATA.indexOf(b) + 1,
    });
  }
  console.log(`  ✓ 品牌: ${BRAND_IDS.length} 个`);

  // 5. 飞行器型号 (30)
  console.log("  ✈️ 创建飞行器型号...");
  for (const m of MODEL_DATA) {
    const id = uid("model");
    MODEL_IDS.push(id);
    await db.insert(aircraftModelsTable).values({
      id, slug: m.slug, name: m.name,
      categoryId: CATEGORY_IDS[m.catIdx],
      brandId: BRAND_IDS[m.brandIdx],
      ownerId: pick(regularUsers),
      powerType: m.power,
      summary: pick(["经典机型，性能稳定", "新一代飞行器代表", "市场热门机型", "技术创新典范", "行业标杆产品"]),
      description: `${m.name} 是一款${m.power === "electric" ? "电动" : "燃油"}飞行器，${m.flight ? `续航 ${m.flight} 分钟` : ""}，${m.range ? `航程 ${m.range} 公里` : ""}，${m.speed ? `最高时速 ${m.speed} km/h` : ""}。`,
      priceMin: m.priceMin, priceMax: m.priceMax,
      maxFlightTimeMinutes: m.flight || null,
      maxRangeKilometers: m.range || null,
      maxSpeedKph: m.speed || null,
      takeoffWeightGrams: m.weight || null,
    });
  }
  console.log(`  ✓ 型号: ${MODEL_IDS.length} 个`);

  // 6. 内容分类 (5)
  console.log("  📑 创建内容分类...");
  for (const c of CONTENT_CAT_DATA) {
    const id = uid("ccat");
    CONTENT_CAT_IDS.push(id);
    await db.insert(contentCategoriesTable).values({ id, slug: c.slug, name: c.name, sortOrder: CONTENT_CAT_DATA.indexOf(c) + 1 });
  }
  console.log(`  ✓ 内容分类: ${CONTENT_CAT_IDS.length} 个`);

  // 7. 文件记录 (80+)
  console.log("  📁 创建文件记录...");
  const fileIds: string[] = [];
  const fileEntries = [];
  for (let i = 0; i < FILE_KEYS.length; i++) {
    const fileId = uid("file");
    fileIds.push(fileId);
    const key = FILE_KEYS[i];
    const isVideo = key.endsWith(".mp4");
    const bizType = key.includes("ranking-cover") ? "ranking-cover-image"
      : key.includes("ranking/items") ? "ranking-item-image"
      : key.includes("models") ? "aircraft-cover-image"
      : key.includes("submissions") ? "aircraft-cover-image"
      : key.includes("videos") ? "post-video"
      : "post-image";

    fileEntries.push({
      id: fileId,
      ownerId: pick(USER_IDS),
      postId: null,
      bizType,
      mediaKind: isVideo ? "video" : "image",
      provider: "minio",
      bucket: process.env.STORAGE_BUCKET?.trim() || "feijia-media",
      region: process.env.STORAGE_REGION?.trim() || "us-east-1",
      objectKey: key,
      filename: key.split("/").pop() || "file",
      contentType: isVideo ? "video/mp4" : "image/png",
      size: isVideo ? randInt(1000000, 50000000) : randInt(50000, 5000000),
      status: "uploaded",
      visibility: "public",
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      uploadedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }

  // 批量插入，每次 50 条
  for (let i = 0; i < fileEntries.length; i += 50) {
    await db.insert(filesTable).values(fileEntries.slice(i, i + 50));
  }
  console.log(`  ✓ 文件记录: ${fileEntries.length} 个`);

  // 更新用户头像
  const avatarFileIds = fileEntries.filter(f => f.objectKey.includes("avatars")).map(f => f.id);
  for (let i = 0; i < Math.min(avatarFileIds.length, regularUsers.length); i++) {
    await db.update(usersTable).set({ avatarFileId: avatarFileIds[i] }).where(sql`id = ${regularUsers[i]}`);
  }
  await db.update(usersTable).set({ avatarFileId: avatarFileIds[0] || null }).where(sql`id = ${adminId}`);
  console.log("  ✓ 用户头像已关联");

  // 8. 帖子 (60: 30 文章 + 30 动态)
  console.log("  📝 创建帖子...");
  const articlePostIds: string[] = [];
  const momentPostIds: string[] = [];
  const pendingPostIds: string[] = [];
  const rejectedPostIds: string[] = [];
  const allPostIds: string[] = [];

  const posts = [];
  for (let i = 0; i < 30; i++) {
    const id = uid("post");
    const authorId = pick(regularUsers);
    const status = i < 24 ? "published" : i < 27 ? "pending" : "rejected";
    const catId = pick(CONTENT_CAT_IDS);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const publishedAt = status === "published" ? createdAt : null;

    if (status === "published") articlePostIds.push(id);
    if (status === "pending") pendingPostIds.push(id);
    if (status === "rejected") rejectedPostIds.push(id);
    allPostIds.push(id);

    posts.push({
      id, authorId, type: "article" as const,
      title: ARTICLE_TITLES[i % ARTICLE_TITLES.length],
      content: `这是第 ${i + 1} 篇测试文章的正文内容。${REVIEW_CONTENTS[i % REVIEW_CONTENTS.length]}`,
      contentHtml: `<p>${ARTICLE_TITLES[i % ARTICLE_TITLES.length]}</p><p>${REVIEW_CONTENTS[i % REVIEW_CONTENTS.length]}</p>`,
      contentPlainText: ARTICLE_TITLES[i % ARTICLE_TITLES.length] + " " + REVIEW_CONTENTS[i % REVIEW_CONTENTS.length],
      contentCategoryId: catId,
      status, rejectionReason: status === "rejected" ? pick(REPORT_REASONS) : null,
      commentCount: randInt(0, 15),
      reportCount: status !== "published" ? randInt(0, 3) : 0,
      likeCount: randInt(0, 50),
      favoriteCount: randInt(0, 30),
      shareCount: randInt(0, 10),
      createdAt, updatedAt: createdAt, publishedAt,
    });
  }

  for (let i = 0; i < 30; i++) {
    const id = uid("post");
    const authorId = pick(regularUsers);
    const status = i < 25 ? "published" : i < 28 ? "pending" : "hidden";
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));

    if (status === "published") momentPostIds.push(id);
    if (status === "pending") pendingPostIds.push(id);
    allPostIds.push(id);

    posts.push({
      id, authorId, type: "moment" as const,
      title: `${pick(USER_DISPLAY_NAMES.slice(0, 20))}的${MOMENT_TITLES[i % MOMENT_TITLES.length]}`,
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length] + ` 今天天气不错，飞了一圈。`,
      contentPlainText: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length] + ` 今天天气不错，飞了一圈。`,
      contentCategoryId: null,
      status, rejectionReason: null,
      commentCount: randInt(0, 8),
      reportCount: 0,
      likeCount: randInt(0, 30),
      favoriteCount: randInt(0, 15),
      shareCount: randInt(0, 5),
      createdAt, updatedAt: createdAt, publishedAt: status === "published" ? createdAt : null,
    });
  }

  for (let i = 0; i < posts.length; i += 50) {
    await db.insert(postsTable).values(posts.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子: ${posts.length} 个 (文章 30 + 动态 30)`);

  // 关联帖子图片
  const postImageFiles = fileEntries.filter(f => f.bizType === "post-image");
  for (let i = 0; i < Math.min(postImageFiles.length, allPostIds.length); i++) {
    await db.update(filesTable).set({ postId: allPostIds[i] }).where(sql`id = ${postImageFiles[i].id}`);
  }
  console.log("  ✓ 帖子图片已关联");

  // 9. 帖子评论 (120)
  console.log("  💬 创建帖子评论...");
  const postComments = [];
  const commentIds: string[] = [];
  for (let i = 0; i < 120; i++) {
    const id = uid("pcomment");
    commentIds.push(id);
    const postId = pick(allPostIds);
    const authorId = pick(regularUsers);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const isReply = i > 30 && Math.random() > 0.6;
    const parentCommentId = isReply ? pick(commentIds.slice(0, Math.min(30, commentIds.length))) : null;

    postComments.push({
      id, postId, authorId,
      parentCommentId,
      replyToCommentId: parentCommentId,
      replyToUserId: parentCommentId ? pick(regularUsers) : null,
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length],
      status: pick(["visible", "visible", "visible", "hidden"]),
      likeCount: randInt(0, 20),
      reportCount: randInt(0, 2),
      createdAt, updatedAt: createdAt,
    });
  }
  for (let i = 0; i < postComments.length; i += 50) {
    await db.insert(postCommentsTable).values(postComments.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子评论: ${postComments.length} 条`);

  // 10. 帖子互动 (200)
  console.log("  ❤️ 创建帖子互动...");
  const interactions = [];
  const types = ["like", "favorite", "share"] as const;
  for (let i = 0; i < 200; i++) {
    interactions.push({
      id: uid("pinter"),
      postId: pick(allPostIds),
      userId: pick(regularUsers),
      type: pick(types),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < interactions.length; i += 50) {
    await db.insert(postInteractionsTable).values(interactions.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子互动: ${interactions.length} 条`);

  // 11. 帖子评论点赞 (80)
  console.log("  👍 创建帖子评论点赞...");
  const commentLikes = [];
  for (let i = 0; i < 80; i++) {
    commentLikes.push({
      id: uid("clike"),
      commentId: pick(commentIds),
      userId: pick(regularUsers),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < commentLikes.length; i += 50) {
    await db.insert(postCommentLikesTable).values(commentLikes.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子评论点赞: ${commentLikes.length} 条`);

  // 12. 飞行器评测 (40)
  console.log("  ⭐ 创建飞行器评测...");
  const reviewIds: string[] = [];
  const reviews = [];
  for (let i = 0; i < 40; i++) {
    const id = uid("review");
    reviewIds.push(id);
    reviews.push({
      id,
      modelId: pick(MODEL_IDS),
      userId: pick(regularUsers),
      rating: randInt(1, 5),
      content: REVIEW_CONTENTS[i % REVIEW_CONTENTS.length],
      status: pick(["visible", "visible", "visible", "hidden"]),
      likeCount: randInt(0, 30),
      reportCount: randInt(0, 2),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < reviews.length; i += 50) {
    await db.insert(aircraftReviewsTable).values(reviews.slice(i, i + 50));
  }
  console.log(`  ✓ 飞行器评测: ${reviews.length} 条`);

  // 13. 飞行器型号评论 (50)
  console.log("  🗣️ 创建飞行器型号评论...");
  const modelCommentIds: string[] = [];
  const modelComments = [];
  for (let i = 0; i < 50; i++) {
    const id = uid("mcomment");
    modelCommentIds.push(id);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const isReply = i > 15 && Math.random() > 0.6;
    const parentId = isReply ? pick(modelCommentIds.slice(0, Math.min(15, modelCommentIds.length))) : null;
    modelComments.push({
      id,
      modelId: pick(MODEL_IDS),
      authorId: pick(regularUsers),
      parentCommentId: parentId,
      replyToCommentId: parentId,
      replyToUserId: parentId ? pick(regularUsers) : null,
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length],
      status: "visible",
      likeCount: randInt(0, 15),
      reportCount: randInt(0, 1),
      createdAt, updatedAt: createdAt,
    });
  }
  for (let i = 0; i < modelComments.length; i += 50) {
    await db.insert(aircraftModelCommentsTable).values(modelComments.slice(i, i + 50));
  }
  console.log(`  ✓ 飞行器型号评论: ${modelComments.length} 条`);

  // 14. 飞行器型号互动 (80)
  console.log("  📌 创建飞行器型号互动...");
  const modelInteractions = [];
  for (let i = 0; i < 80; i++) {
    modelInteractions.push({
      id: uid("minter"),
      modelId: pick(MODEL_IDS),
      userId: pick(regularUsers),
      type: pick(["favorite", "viewed", "compared"]),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < modelInteractions.length; i += 50) {
    await db.insert(aircraftModelInteractionsTable).values(modelInteractions.slice(i, i + 50));
  }
  console.log(`  ✓ 飞行器型号互动: ${modelInteractions.length} 条`);

  // 15. 排行榜 (10)
  console.log("  🏆 创建排行榜...");
  const rankingIds: string[] = [];
  const rankingCoverFiles = fileEntries.filter(f => f.bizType === "ranking-cover-image");
  for (let i = 0; i < 10; i++) {
    const id = uid("ranking");
    rankingIds.push(id);
    await db.insert(rankingsTable).values({
      id,
      authorId: pick(regularUsers),
      type: pick(["community", "community", "official"]),
      title: RANKING_TITLES[i % RANKING_TITLES.length],
      description: RANKING_DESCS[i % RANKING_DESCS.length],
      coverImageFileId: rankingCoverFiles[i % rankingCoverFiles.length]?.id || null,
      itemAddPolicy: pick(["owner", "anyone", "moderated"]),
      commentCount: randInt(0, 10),
      reportCount: randInt(0, 2),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  console.log(`  ✓ 排行榜: ${rankingIds.length} 个`);

  // 16. 排行榜项目 (50)
  console.log("  📊 创建排行榜项目...");
  const rankingItemIds: string[] = [];
  const rankingItemFiles = fileEntries.filter(f => f.bizType === "ranking-item-image");
  const rankingItems = [];
  for (let i = 0; i < 50; i++) {
    const id = uid("rtarget");
    rankingItemIds.push(id);
    rankingItems.push({
      id,
      rankingId: rankingIds[i % rankingIds.length],
      authorId: pick(regularUsers),
      linkedModelId: Math.random() > 0.3 ? pick(MODEL_IDS) : null,
      status: pick(["published", "published", "published", "pending"]),
      rejectionReason: null,
      rank: (i % 10) + 1,
      title: `${pick(MODEL_DATA).name} ${RANKING_ITEM_TITLES[i % RANKING_ITEM_TITLES.length]}`,
      summary: RANKING_ITEM_TITLES[i % RANKING_ITEM_TITLES.length],
      imageFileId: rankingItemFiles[i % rankingItemFiles.length]?.id || null,
      brandName: pick(BRAND_DATA).name,
      commentCount: randInt(0, 8),
      likeCount: randInt(0, 25),
      reportCount: randInt(0, 1),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < rankingItems.length; i += 50) {
    await db.insert(ratingTargetsTable).values(rankingItems.slice(i, i + 50));
  }
  console.log(`  ✓ 排行榜项目: ${rankingItems.length} 个`);

  // 17. 排行榜评论 (20)
  console.log("  🗨️ 创建排行榜评论...");
  const rankingComments = [];
  for (let i = 0; i < 20; i++) {
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    rankingComments.push({
      id: uid("rcomment"),
      rankingId: pick(rankingIds),
      authorId: pick(regularUsers),
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length],
      status: "visible",
      likeCount: randInt(0, 10),
      reportCount: randInt(0, 1),
      createdAt, updatedAt: createdAt,
    });
  }
  for (let i = 0; i < rankingComments.length; i += 50) {
    await db.insert(rankingCommentsTable).values(rankingComments.slice(i, i + 50));
  }
  console.log(`  ✓ 排行榜评论: ${rankingComments.length} 条`);

  // 18. 排行榜项目评分 (100)
  console.log("  🔢 创建排行榜项目评分...");
  const ratings = [];
  for (let i = 0; i < 100; i++) {
    ratings.push({
      id: uid("rating"),
      ratingTargetId: pick(rankingItemIds),
      userId: pick(regularUsers),
      rating: randInt(1, 5),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < ratings.length; i += 50) {
    await db.insert(ratingTargetRatingsTable).values(ratings.slice(i, i + 50));
  }
  console.log(`  ✓ 排行榜项目评分: ${ratings.length} 条`);

  // 19. 排行榜项目评论 (40)
  console.log("  💬 创建排行榜项目评论...");
  const rtComments = [];
  const rtCommentIds: string[] = [];
  for (let i = 0; i < 40; i++) {
    const id = uid("rtcomment");
    rtCommentIds.push(id);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const isReply = i > 10 && Math.random() > 0.6;
    const parentId = isReply ? pick(rtCommentIds.slice(0, Math.min(10, rtCommentIds.length))) : null;
    rtComments.push({
      id,
      ratingTargetId: pick(rankingItemIds),
      authorId: pick(regularUsers),
      parentCommentId: parentId,
      replyToCommentId: parentId,
      replyToUserId: parentId ? pick(regularUsers) : null,
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length],
      rating: randInt(1, 5),
      status: "visible",
      likeCount: randInt(0, 10),
      reportCount: randInt(0, 1),
      createdAt, updatedAt: createdAt,
    });
  }
  for (let i = 0; i < rtComments.length; i += 50) {
    await db.insert(ratingTargetCommentsTable).values(rtComments.slice(i, i + 50));
  }
  console.log(`  ✓ 排行榜项目评论: ${rtComments.length} 条`);

  // 20. 用户关注 (80)
  console.log("  👥 创建用户关注...");
  const follows = [];
  const followSet = new Set<string>();
  let followCount = 0;
  while (followCount < 80) {
    const follower = pick(regularUsers);
    const followee = pick(regularUsers);
    if (follower === followee) continue;
    const key = `${follower}-${followee}`;
    if (followSet.has(key)) continue;
    followSet.add(key);
    follows.push({
      id: uid("follow"),
      followerId: follower,
      followeeId: followee,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
    followCount++;
  }
  for (let i = 0; i < follows.length; i += 50) {
    await db.insert(userFollowsTable).values(follows.slice(i, i + 50));
  }
  console.log(`  ✓ 用户关注: ${follows.length} 条`);

  // 21. 通知 (100)
  console.log("  🔔 创建通知...");
  const notifications = [];
  const notifTypes = ["followed", "post_commented", "comment_replied", "post_liked", "ranking_commented", "model_reviewed"] as const;
  for (let i = 0; i < 100; i++) {
    notifications.push({
      id: uid("notif"),
      userId: pick(regularUsers),
      actorId: pick(regularUsers),
      type: pick(notifTypes),
      postId: Math.random() > 0.5 ? pick(allPostIds) : null,
      commentId: Math.random() > 0.6 ? pick(commentIds) : null,
      isRead: Math.random() > 0.6,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < notifications.length; i += 50) {
    await db.insert(notificationsTable).values(notifications.slice(i, i + 50));
  }
  console.log(`  ✓ 通知: ${notifications.length} 条`);

  // 22. 会话 (30)
  console.log("  🔑 创建会话...");
  const sessions = [];
  const scopes = ["web", "app"] as const;
  const devices = ["Chrome on Windows", "Safari on macOS", "FeijiaApp iOS", "FeijiaApp Android", "Firefox on Linux", "Edge on Windows"];
  for (let i = 0; i < 30; i++) {
    sessions.push({
      id: `sess_${createSecretToken(24)}`,
      userId: pick(USER_IDS),
      scope: pick(scopes),
      clientIp: `${randInt(1, 255)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 255)}`,
      userAgent: `Mozilla/5.0 (${pick(devices)})`,
      deviceLabel: pick(devices),
      refreshTokenHash: hashToken(createSecretToken(32)),
      refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      accessExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
  }
  for (let i = 0; i < sessions.length; i += 50) {
    await db.insert(sessionsTable).values(sessions.slice(i, i + 50));
  }
  console.log(`  ✓ 会话: ${sessions.length} 个`);

  // 23. 飞行器提交 (15)
  console.log("  📤 创建飞行器提交...");
  const submissionCoverFiles = fileEntries.filter(f => f.bizType === "aircraft-cover-image");
  const submissions = [];
  const statuses = ["submitted", "submitted", "submitted", "approved", "approved", "rejected"] as const;
  for (let i = 0; i < 15; i++) {
    const status = pick(statuses);
    submissions.push({
      id: uid("submission"),
      authorId: pick(regularUsers),
      status,
      categoryId: pick(CATEGORY_IDS),
      brandId: Math.random() > 0.3 ? pick(BRAND_IDS) : null,
      proposedBrandName: Math.random() > 0.7 ? "新品牌" + (i + 1) : null,
      modelName: SUBMISSION_NAMES[i % SUBMISSION_NAMES.length],
      powerType: pick(["electric", "fuel", "hybrid"]),
      summary: `测试提交：${SUBMISSION_NAMES[i % SUBMISSION_NAMES.length]}`,
      description: `这是第 ${i + 1} 个测试提交，状态为 ${status}。`,
      rejectionReason: status === "rejected" ? pick(REPORT_REASONS) : null,
      coverImageFileId: submissionCoverFiles[i % submissionCoverFiles.length]?.id || null,
      galleryImageFileIds: JSON.stringify(submissionCoverFiles.slice(i % submissionCoverFiles.length, (i % submissionCoverFiles.length) + 2).map(f => f.id)),
      videoFileId: null,
      priceMin: randInt(1000, 100000),
      priceMax: randInt(100000, 500000),
      maxFlightTimeMinutes: randInt(15, 60),
      maxRangeKilometers: randInt(5, 50),
      maxSpeedKph: randInt(40, 150),
      takeoffWeightGrams: randInt(200, 5000),
      approvedModelId: status === "approved" ? pick(MODEL_IDS) : null,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < submissions.length; i += 50) {
    await db.insert(aircraftSubmissionsTable).values(submissions.slice(i, i + 50));
  }
  console.log(`  ✓ 飞行器提交: ${submissions.length} 个`);

  // 24. 举报数据
  console.log("  🚩 创建举报数据...");
  // 帖子举报 (15)
  const postReports = [];
  for (let i = 0; i < 15; i++) {
    postReports.push({
      id: uid("preport"),
      postId: pick([...pendingPostIds, ...rejectedPostIds, ...allPostIds.slice(0, 10)]),
      reporterId: pick(regularUsers),
      reason: pick(REPORT_REASONS),
      imageFileIds: JSON.stringify([]),
    });
  }
  for (let i = 0; i < postReports.length; i += 50) {
    await db.insert(postReportsTable).values(postReports.slice(i, i + 50));
  }

  // 帖子评论举报 (10)
  const postCommentReports = [];
  for (let i = 0; i < 10; i++) {
    postCommentReports.push({
      id: uid("pcreport"),
      commentId: pick(commentIds),
      reporterId: pick(regularUsers),
      reason: pick(REPORT_REASONS),
      imageFileIds: JSON.stringify([]),
    });
  }
  for (let i = 0; i < postCommentReports.length; i += 50) {
    await db.insert(postCommentReportsTable).values(postCommentReports.slice(i, i + 50));
  }

  // 排行榜举报 (5)
  const rankingReports = [];
  for (let i = 0; i < 5; i++) {
    rankingReports.push({
      id: uid("rreport"),
      rankingId: pick(rankingIds),
      reporterId: pick(regularUsers),
      reason: pick(REPORT_REASONS),
      imageFileIds: JSON.stringify([]),
    });
  }
  for (let i = 0; i < rankingReports.length; i += 50) {
    await db.insert(rankingReportsTable).values(rankingReports.slice(i, i + 50));
  }

  // 排行榜项目举报 (5)
  const rtReports = [];
  for (let i = 0; i < 5; i++) {
    rtReports.push({
      id: uid("rtreport"),
      ratingTargetId: pick(rankingItemIds),
      reporterId: pick(regularUsers),
      reason: pick(REPORT_REASONS),
      imageFileIds: JSON.stringify([]),
    });
  }
  for (let i = 0; i < rtReports.length; i += 50) {
    await db.insert(ratingTargetReportsTable).values(rtReports.slice(i, i + 50));
  }

  // 排行榜项目评论举报 (5)
  const rtCommentReports = [];
  for (let i = 0; i < 5; i++) {
    rtCommentReports.push({
      id: uid("rtcreport"),
      commentId: pick(rtCommentIds),
      reporterId: pick(regularUsers),
      reason: pick(REPORT_REASONS),
      imageFileIds: JSON.stringify([]),
    });
  }
  for (let i = 0; i < rtCommentReports.length; i += 50) {
    await db.insert(ratingTargetCommentReportsTable).values(rtCommentReports.slice(i, i + 50));
  }

  console.log("  ✓ 举报数据: 帖子 15 + 评论 10 + 排行榜 5 + 项目 5 + 项目评论 5");

  // 25. 站点设置
  console.log("  ⚙️ 创建站点设置...");
  await db.insert(siteSettingsTable).values({
    id: uid("site"),
    postModerationEnabled: true,
    commentModerationEnabled: false,
    reviewModerationEnabled: false,
    submissionModerationEnabled: true,
    rankingModerationEnabled: false,
    articleModerationEnabled: true,
    momentModerationEnabled: true,
    brandModerationEnabled: true,
    modelModerationEnabled: true,
    ratingTargetModerationEnabled: true,
  });
  console.log("  ✓ 站点设置: 1 个");

  console.log("\n  ✅ PostgreSQL 推送完成！");
}

// ==================== 主函数 ====================

async function main() {
  console.log("🚀 飞加项目海量测试数据生成脚本");
  console.log("================================");

  try {
    await seedMinIO();
    await seedRedis();
    await seedPostgreSQL();

    console.log("\n================================");
    console.log("🎉 测试数据生成完成！");
    console.log("\n📋 测试账号:");
    console.log("  管理员: testadmin / TestAdmin#123");
    console.log("  普通用户: 50 个 (手机号 138 开头，短信登录)");
    console.log("\n🔑 Redis 测试数据:");
    console.log("  图形验证码: test_captcha_001 (code: TEST01)");
    console.log("  短信验证码: 13800138000 (code: 888888)");
    console.log("  注册令牌: test_reg_001");
    console.log("\n📦 MinIO: feijia-media bucket, test/ 前缀");
  } catch (error) {
    console.error("\n❌ 测试数据生成失败:", error);
    process.exit(1);
  }
}

void main();
