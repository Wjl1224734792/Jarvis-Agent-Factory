/**
 * 飞加项目测试数据生成脚本
 *
 * 用途：向 PostgreSQL、Redis 和对象存储推送测试数据
 * 使用：bun run packages/db/src/seed.test-data.ts
 *
 * 数据规模：
 * - 用户：50 个（头像用 测试头像1.jpg/2.jpg 轮流分配）
 * - 圈子：10 个（封面用 封面图1-4.webp 轮流）
 * - 帖子：200 篇（文章 150 + 动态 50），封面用 封面图1-4.webp，内容图用 文章测试图.jpg
 * - 机型：30 个（封面用 封面图1-4.webp）
 * - 榜单：5 个，每个 10 个条目（封面用 封面图1-4.webp）
 * - 评论：每个帖子 3-5 条（约 600-1000 条）
 * - 所有媒体文件引用路径：/docs/tests_img-video/文件名
 */

/* eslint-disable no-console */

import { createClient } from "redis";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { db } from "./client.js";
import {
  aircraftCategoriesTable,
  aircraftModelsTable,
  brandsTable,
  circlesTable,
  circleMembersTable,
  circlePostsTable,
  circlePostInteractionsTable,
  circlePostCommentsTable,
  contentCategoriesTable,
  filesTable,
  notificationsTable,
  postCommentsTable,
  postInteractionsTable,
  postsTable,
  powerTypesTable,
  rankingCommentsTable,
  rankingsTable,
  ratingTargetRatingsTable,
  ratingTargetsTable,
  rolesTable,
  siteSettingsTable,
  userFollowsTable,
  userSettingsTable,
  usersTable,
} from "./schema.js";
import { sql } from "drizzle-orm";
import { hashVerificationCode, createId } from "./helpers.js";

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

function resolveSeedAuthCodeHashSecret() {
  return process.env.AUTH_CODE_HASH_SECRET?.trim() || "feijia-dev-auth-code-hash-secret";
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

function buildUniqueRows<T>(
  targetCount: number,
  build: () => { key: string; value: T },
  maxAttempts = targetCount * 20
): T[] {
  const keys = new Set<string>();
  const rows: T[] = [];
  let attempts = 0;

  while (rows.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const entry = build();
    if (keys.has(entry.key)) {
      continue;
    }
    keys.add(entry.key);
    rows.push(entry.value);
  }

  if (rows.length < targetCount) {
    throw new Error(
      `Unable to generate enough unique rows. target=${targetCount}, actual=${rows.length}`
    );
  }

  return rows;
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

const BRAND_DATA = [
  { slug: "dji", name: "DJI 大疆", categoryIdx: 0 },
  { slug: "autel", name: "Autel 道通", categoryIdx: 0 },
  { slug: "hubsan", name: "Hubsan 哈博森", categoryIdx: 0 },
  { slug: "fimi", name: "FIMI 飞米", categoryIdx: 0 },
  { slug: "ehang", name: "EHang 亿航", categoryIdx: 1 },
  { slug: "joby", name: "Joby Aviation", categoryIdx: 1 },
  { slug: "volocopter", name: "Volocopter", categoryIdx: 1 },
  { slug: "lilium", name: "Lilium", categoryIdx: 1 },
  { slug: "robinson", name: "Robinson 罗宾逊", categoryIdx: 2 },
  { slug: "cirrus", name: "Cirrus 西锐", categoryIdx: 3 },
  { slug: "embraer", name: "Embraer 巴航工业", categoryIdx: 3 },
  { slug: "xpeng-aero", name: "小鹏汇天", categoryIdx: 1 },
  { slug: "auto-flight", name: "峰飞航空", categoryIdx: 1 },
  { slug: "parrot", name: "Parrot 派诺特", categoryIdx: 0 },
  { slug: "skydio", name: "Skydio", categoryIdx: 0 },
];

const MODEL_DATA = [
  { slug: "mini-4-pro", name: "DJI Mini 4 Pro", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 4999, priceMax: 6999, flight: 45, range: 18, speed: 58, weight: 249 },
  { slug: "mavic-3-pro", name: "DJI Mavic 3 Pro", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 13888, priceMax: 17688, flight: 43, range: 28, speed: 75, weight: 958 },
  { slug: "air-3", name: "DJI Air 3", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 6988, priceMax: 9988, flight: 46, range: 20, speed: 68, weight: 720 },
  { slug: "inspire-3", name: "DJI Inspire 3", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 109999, priceMax: 139999, flight: 28, range: 15, speed: 94, weight: 3995 },
  { slug: "matrice-350", name: "DJI Matrice 350 RTK", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 59999, priceMax: 79999, flight: 55, range: 20, speed: 82, weight: 6300 },
  { slug: "dji-fpv-2", name: "DJI FPV 2", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 4299, priceMax: 6299, flight: 20, range: 12, speed: 140, weight: 410 },
  { slug: "dji-mini-3-pro", name: "DJI Mini 3 Pro", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 3999, priceMax: 5499, flight: 34, range: 18, speed: 57, weight: 249 },
  { slug: "dji-mavic-3-classic", name: "DJI Mavic 3 Classic", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 10499, priceMax: 12888, flight: 46, range: 30, speed: 75, weight: 895 },
  { slug: "evo-lite-plus", name: "Autel EVO Lite+", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 7299, priceMax: 8599, flight: 40, range: 24, speed: 68, weight: 835 },
  { slug: "evo-nano-plus", name: "Autel EVO Nano+", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 4299, priceMax: 5499, flight: 28, range: 16, speed: 54, weight: 249 },
  { slug: "evo-max-4t", name: "Autel EVO Max 4T", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 49999, priceMax: 69999, flight: 42, range: 20, speed: 72, weight: 1150 },
  { slug: "autel-evo-ii-pro", name: "Autel EVO II Pro V3", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 11999, priceMax: 15999, flight: 40, range: 25, speed: 72, weight: 1190 },
  { slug: "zino-mini-pro", name: "Hubsan Zino Mini Pro", brandIdx: 2, catIdx: 0, power: "electric", priceMin: 2999, priceMax: 3999, flight: 40, range: 10, speed: 56, weight: 249 },
  { slug: "fimi-x8se", name: "FIMI X8 SE 2022", brandIdx: 3, catIdx: 0, power: "electric", priceMin: 3999, priceMax: 5499, flight: 35, range: 12, speed: 65, weight: 795 },
  { slug: "parrot-anafi-ai", name: "Parrot Anafi Ai", brandIdx: 13, catIdx: 0, power: "electric", priceMin: 24999, priceMax: 34999, flight: 32, range: 20, speed: 60, weight: 898 },
  { slug: "skydio-x10", name: "Skydio X10", brandIdx: 14, catIdx: 0, power: "electric", priceMin: 49999, priceMax: 69999, flight: 40, range: 12, speed: 72, weight: 1490 },
  { slug: "eh216-s", name: "EHang EH216-S", brandIdx: 4, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 25, range: 35, speed: 130, weight: null },
  { slug: "joby-s4", name: "Joby S4", brandIdx: 5, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 45, range: 240, speed: 320, weight: null },
  { slug: "voloconnect", name: "Volocopter VoloConnect", brandIdx: 6, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 80, speed: 180, weight: null },
  { slug: "lilium-jet", name: "Lilium Jet", brandIdx: 7, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 60, range: 300, speed: 280, weight: null },
  { slug: "xpeng-x3", name: "小鹏汇天陆地航母", brandIdx: 11, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 30, range: 50, speed: 130, weight: null },
  { slug: "autoflight-prosperity", name: "峰飞盛世龙", brandIdx: 12, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 45, range: 250, speed: 200, weight: null },
  { slug: "r44", name: "Robinson R44", brandIdx: 8, catIdx: 2, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 560, speed: 220, weight: null },
  { slug: "vision-jet", name: "Cirrus Vision Jet G2+", brandIdx: 9, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 300, range: 2300, speed: 576, weight: null },
  { slug: "phenom-300e", name: "Embraer Phenom 300E", brandIdx: 10, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 240, range: 3700, speed: 860, weight: null },
  { slug: "dji-agras-t50", name: "DJI Agras T50", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 69999, priceMax: 89999, flight: 20, range: 5, speed: 36, weight: 40000 },
  { slug: "autel-dragonfish", name: "Autel Dragonfish", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 89999, priceMax: 139999, flight: 120, range: 30, speed: 108, weight: 4600 },
  { slug: "eh216-l", name: "EHang EH216-L", brandIdx: 4, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 60, speed: 150, weight: null },
  { slug: "wisk-cora", name: "Wisk Cora", brandIdx: 5, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 40, range: 100, speed: 180, weight: null },
  { slug: "aerofugia-ae200", name: "沃飞长空 AE200", brandIdx: 5, catIdx: 1, power: "electric", priceMin: null, priceMax: null, flight: 40, range: 200, speed: 250, weight: null },
];

const CONTENT_CATEGORY_DATA = [
  { slug: "news", name: "资讯" },
  { slug: "tech", name: "技术" },
  { slug: "review", name: "测评" },
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
  "DJI Mavic 3 Pro 长期使用体验报告",
  "Autel EVO Lite+ 夜景航拍能力测试",
  "固定翼 vs 多旋翼：长航程任务选择指南",
  "eVTOL 适航审定最新进展汇总",
  "无人机冷链物流应用前景分析",
  "FPV 竞速无人机选购与组装指南",
  "航拍全景图拍摄与后期合成全流程",
  "无人机在林业资源调查中的应用实践",
  "低空经济政策红包：2026 补贴申领指南",
  "无人机测绘精度影响因素深度分析",
  "个人飞行器离我们还有多远？",
  "航拍纪录片拍摄经验分享",
  "混合垂直起降飞行器技术难点剖析",
  "无人机在光伏电站巡检中的实战经验",
  "如何搭建专业的航拍工作流",
  "低空交通管理系统技术架构探讨",
  "无人机编队飞行通信协议解析",
  "城市物流无人机航线规划方法论",
  "航拍中的天气判断与应对策略",
  "氢燃料电池在无人机上的应用前景",
  "无人机在海上风电场运维中的应用",
  "飞行器噪声控制技术与法规趋势",
  "无人机机场自动化运营方案",
  "eVTOL 电池技术路线之争",
  "低空旅游商业模式探索",
  "航空摄影测量与三维建模入门",
  "无人机反制技术与安全防护",
  "城市空中交通法规框架国际比较",
  "AI 在无人机自主飞行中的应用",
  "无人机在高精度农业中的应用与收益分析",
];

const MOMENT_TITLES = [
  "今日飞行记录", "周末航拍打卡", "新入手的飞行器首飞",
  "夕阳下的城市天际线", "山谷飞行体验", "海边航拍日记",
  "夜间飞行测试", "春季花海航拍", "雪山航拍挑战",
  "城市夜景航拍", "森林航拍探险", "湖泊航拍记录",
  "田野航拍随拍", "桥梁航拍特写", "港口航拍日志",
  "雾中飞行", "日出航拍", "沙漠飞行探险",
  "草原航拍", "水库飞行记录", "高架桥穿越",
  "峡谷飞行", "海岸线巡逻", "城市建筑群扫描",
  "园林航拍", "古镇鸟瞰", "新机开箱测试",
  "风暴前飞行", "云层穿透", "极光飞行记录",
  "瀑布航拍", "梯田飞行", "雪山攀登伴飞",
  "湖畔落日", "工业区巡查", "高速路况监测",
  "体育赛事航拍", "烟花表演记录", "热气球伴飞",
  "夜间灯光秀航拍",
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
];

const RANKING_DESCS = [
  "综合画质、续航、便携性等多维度评选出的年度最佳航拍无人机",
  "适合新手入门的高性价比无人机推荐",
  "基于技术参数和试飞数据的 eVTOL 飞行器排名",
  "面向专业摄影师和影视制作团队的高端设备排行",
  "在性能和价格之间取得最佳平衡的无人机推荐",
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

/** 为媒体文件构建 Kodo file record 字段 */
function buildKodoFileRecord(filename: string) {
  const bucket = process.env.STORAGE_BUCKET?.trim() || "feijia-dev";
  const region = process.env.STORAGE_REGION?.trim() || "cn-east-1";
  const keyPrefix = process.env.STORAGE_KEY_PREFIX?.trim() || "uploads";

  return {
    provider: "kodo" as const,
    bucket,
    region,
    objectKey: keyPrefix ? `${keyPrefix}/seed/${filename}` : `seed/${filename}`,
  };
}

// ==================== Object Storage ====================

/** 获取 Kodo 配置 */
function getKodoConfig() {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.STORAGE_BUCKET?.trim() || "feijia-dev";
  const endpoint = process.env.STORAGE_ENDPOINT?.trim() || "https://up-z0.qiniup.com";
  const kodoRegionId = process.env.KODO_REGION_ID?.trim() || "z0";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("缺少 Kodo 凭证：STORAGE_ACCESS_KEY_ID 或 STORAGE_SECRET_ACCESS_KEY 未设置");
  }

  return { accessKeyId, secretAccessKey, bucket, endpoint, kodoRegionId };
}

/** 上传单个文件到 Kodo（使用直接 HTTP 表单上传） */
async function uploadFileToKodo(
  filePath: string,
  objectKey: string,
  contentType: string
): Promise<boolean> {
  const config = getKodoConfig();
  const qiniu = await import("qiniu");

  // 生成上传凭证
  const mac = new qiniu.auth.digest.Mac(config.accessKeyId, config.secretAccessKey);
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: `${config.bucket}:${objectKey}`,
    expires: 900,
  });
  const uploadToken = putPolicy.uploadToken(mac);

  // 七牛表单上传地址（根据区域）
  const uploadUrl = config.endpoint;

  const { readFile } = await import("node:fs/promises");
  const fileBuffer = await readFile(filePath);
  const blob = new Blob([fileBuffer], { type: contentType });

  const formData = new FormData();
  formData.append("file", blob, objectKey.split("/").pop() ?? "file");
  formData.append("token", uploadToken);
  formData.append("key", objectKey);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      console.log(`  上传成功: ${objectKey}`);
      return true;
    }
    const respText = await response.text().catch(() => "");
    console.error(`  上传失败 ${objectKey}: HTTP ${response.status} ${respText}`);
    return false;
  } catch (err) {
    console.error(`  上传失败 ${objectKey}:`, (err as Error).message);
    return false;
  }
}

/** 检查文件是否已存在于 Kodo */
async function checkFileExistsInKodo(objectKey: string): Promise<boolean> {
  const config = getKodoConfig();
  const qiniu = await import("qiniu");

  const mac = new qiniu.auth.digest.Mac(config.accessKeyId, config.secretAccessKey);
  const qiniuConfig = new qiniu.conf.Config({
    useHttpsDomain: config.endpoint.startsWith("https://"),
  });

  if (config.kodoRegionId) {
    qiniuConfig.regionsProvider = qiniu.httpc.Region.fromRegionId(config.kodoRegionId);
  }

  const bucketManager = new qiniu.rs.BucketManager(mac, qiniuConfig);

  return new Promise<boolean>((resolve) => {
    void bucketManager.stat(config.bucket, objectKey, (err?: Error, _respBody?: unknown, respInfo?: { statusCode?: number }) => {
      if (err) {
        resolve(false);
        return;
      }

      // 612 = 文件不存在，404 = 资源不存在
      if (respInfo?.statusCode === 612 || respInfo?.statusCode === 404) {
        resolve(false);
        return;
      }

      resolve(respInfo?.statusCode === 200);
    });
  });
}

/** 获取需要上传的媒体文件列表 */
function getMediaFilesToUpload(): Array<{ filename: string; contentType: string }> {
  return [
    { filename: "测试头像1.jpg", contentType: "image/jpeg" },
    { filename: "测试头像2.jpg", contentType: "image/jpeg" },
    { filename: "封面图1.webp", contentType: "image/webp" },
    { filename: "封面图2.webp", contentType: "image/webp" },
    { filename: "封面图3.webp", contentType: "image/webp" },
    { filename: "封面图4.webp", contentType: "image/webp" },
    { filename: "文章测试图.jpg", contentType: "image/jpeg" },
    { filename: "测试视频.mp4", contentType: "video/mp4" },
  ];
}

async function seedObjectStorage() {
  console.log("\n 开始上传媒体文件到 Kodo...");

  const { join, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  // 从当前文件位置向上找仓库根目录（packages/db/src → 仓库根）
  const currentFileDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = join(currentFileDir, "..", "..", "..");
  const mediaDir = join(repoRoot, "docs", "tests_img-video");
  const keyPrefix = process.env.STORAGE_KEY_PREFIX?.trim() || "uploads";

  const mediaFiles = getMediaFilesToUpload();
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const { filename, contentType } of mediaFiles) {
    const objectKey = keyPrefix ? `${keyPrefix}/seed/${filename}` : `seed/${filename}`;
    const filePath = join(mediaDir, filename);

    // 检查文件是否已存在
    const exists = await checkFileExistsInKodo(objectKey);
    if (exists) {
      console.log(`  跳过（已存在）: ${objectKey}`);
      skipCount++;
      continue;
    }

    // 上传文件
    const success = await uploadFileToKodo(filePath, objectKey, contentType);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n Kodo 上传完成: 成功 ${successCount}, 跳过 ${skipCount}, 失败 ${failCount}`);

  if (failCount > 0) {
    console.warn(`  注意: ${failCount} 个文件上传失败，seed 流程将继续`);
  }
}

// ==================== Redis ====================

async function seedRedis() {
  console.log("\n 开始推送 Redis 测试数据...");

  const client = createClient({
    url: process.env.REDIS_URL?.trim() || "redis://localhost:6379/0",
  });
  await client.connect();

  try {
    const codeHashSecret = resolveSeedAuthCodeHashSecret();

    await client.set("captcha:test_captcha_001", JSON.stringify({
      challengeId: "test_captcha_001",
      codeHash: hashVerificationCode({
        code: "TEST01",
        purpose: "captcha",
        subject: "test_captcha_001",
        secret: codeHashSecret
      }),
      attempts: 0
    }), { EX: 300 });

    await client.set("sms:13800138000", JSON.stringify({
      requestId: "test_sms_001",
      phone: "13800138000",
      codeHash: hashVerificationCode({
        code: "888888",
        purpose: "sms",
        subject: "13800138000",
        secret: codeHashSecret
      }),
      attempts: 0
    }), { EX: 300 });

    await client.set("reg:test_reg_001", JSON.stringify({
      registrationToken: "test_reg_001", phone: "13900139000",
      suggestedDisplayName: "新飞友", clientIp: "127.0.0.1", userAgent: "TestApp/1.0", deviceLabel: "Test Device",
    }), { EX: 600 });

    // 构建 CDN 基础 URL
    const cdnBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL?.trim() || "http://telkuj4lw.hn-bkt.clouddn.com";
    const keyPrefix = process.env.STORAGE_KEY_PREFIX?.trim() || "uploads";

    await client.set("feed:hot-circle", JSON.stringify(
      Array.from({ length: 10 }, (_, i) => ({
        id: `circle-${i + 1}`, title: `circle-${i + 1}`,
        mediaPath: `${cdnBaseUrl}/${keyPrefix}/seed/封面图${(i % 4) + 1}.webp`, heat: 100 - i * 7,
      }))
    ));
    await client.set("feed:hot-models", JSON.stringify(
      MODEL_DATA.slice(0, 10).map((m, i) => ({ slug: m.slug, name: m.name, heat: 98 - i * 5 }))
    ));
    await client.set("feed:hot-rankings", JSON.stringify(
      RANKING_TITLES.map((title, i) => ({ id: `ranking-${i + 1}`, title, heat: 95 - i * 8 }))
    ));

    console.log("  Redis 推送完成");
  } finally {
    await client.disconnect();
  }
}

// ==================== PostgreSQL ====================

const CATEGORY_IDS: string[] = [];
const BRAND_IDS: string[] = [];
const MODEL_IDS: string[] = [];
const CONTENT_CAT_IDS: string[] = [];
const CIRCLE_IDS: string[] = [];

async function seedPostgreSQL() {
  console.log("\n 开始推送 PostgreSQL 测试数据...");

  console.log("   清理已有测试数据...");
  await db.execute(sql.raw(
    `TRUNCATE TABLE "rating_target_comment_likes", "rating_target_comments", "rating_target_comment_reports",
      "rating_target_ratings", "rating_target_reports", "rating_targets", "ranking_comment_likes",
      "ranking_comments", "ranking_comment_reports", "ranking_reports", "rankings",
      "post_comment_likes", "post_comment_reports", "post_comments", "post_interactions",
      "post_reports", "posts", "aircraft_model_comment_likes", "aircraft_model_comments",
      "aircraft_model_comment_reports", "aircraft_model_interactions", "aircraft_model_reports",
      "aircraft_reviews", "aircraft_review_likes", "aircraft_review_reports",
      "review_comments", "review_comment_likes", "review_comment_reports",
      "aircraft_submissions", "brand_applications", "aircraft_models", "brands",
      "content_categories", "aircraft_categories", "power_types", "files", "user_follows",
      "notifications", "user_settings", "sessions", "devices", "site_settings",
      "roles",
      "circle_post_interactions", "circle_post_comments", "circle_post_comment_likes",
      "circle_post_comment_reports", "circle_post_reports",
      "circle_user_categories", "circle_category_assignments",
      "circle_posts", "circle_members", "circles", "users"
      RESTART IDENTITY CASCADE;`
  ));
  console.log("  清理完成");

  // 1. 用户 (50)
  console.log("   创建 50 个用户...");
  const adminPasswordHash = await hashPassword("Admin#123");
  const users = [
    { id: uid("user"), role: "admin" as const, displayName: "系统管理员", phone: null, account: "admin", passwordHash: adminPasswordHash, avatarFileId: null, bio: null },
    ...USER_DISPLAY_NAMES.map((name) => ({
      id: uid("user"), role: "user" as const, displayName: name,
      phone: `138${String(10000000 + randInt(1000000, 9999999)).slice(0, 8)}`,
      account: null, passwordHash: null,
      avatarFileId: null, bio: pick(BIO_TEXTS),
    })),
  ];
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
  const adminId = USER_IDS[0];
  const regularUsers = USER_IDS.slice(1);
  console.log(`  用户: ${users.length} 个 (管理员 1 + 普通用户 ${users.length - 1})`);

  // 2. 角色
  console.log("   创建角色...");
  await db.insert(rolesTable).values([
    { name: "super_admin", label: "超级管理员", permissions: ["*"], description: "拥有系统全部权限" },
    { name: "editor", label: "内容编辑", permissions: ["content:*", "overview:view"], description: "负责内容创建与编辑" },
    { name: "moderator", label: "审核员", permissions: ["moderation:*", "overview:view"], description: "负责内容审核与社区管理" },
    { name: "operator", label: "运营专员", permissions: ["operations:*", "overview:view"], description: "负责运营活动与数据管理" },
  ]);
  const testPwd = await hashPassword("Test#123");
  await db.insert(usersTable).values([
    { id: createId("user"), role: "editor", displayName: "内容编辑测试", phone: "13900139001", account: "editor", passwordHash: testPwd },
    { id: createId("user"), role: "moderator", displayName: "审核员测试", phone: "13900139002", account: "moderator", passwordHash: testPwd },
    { id: createId("user"), role: "operator", displayName: "运营专员测试", phone: "13900139003", account: "operator", passwordHash: testPwd },
  ]);

  // 3. 内容分类 (4)
  console.log("   创建内容分类...");
  for (const c of CONTENT_CATEGORY_DATA) {
    const id = uid("ccat");
    CONTENT_CAT_IDS.push(id);
    await db.insert(contentCategoriesTable).values({ id, slug: c.slug, name: c.name, sortOrder: CONTENT_CATEGORY_DATA.indexOf(c) + 1, isEnabled: true });
  }
  console.log(`  内容分类: ${CONTENT_CAT_IDS.length} 个`);

  // 4. 飞行器分类 (4)
  console.log("   创建飞行器分类...");
  const aircraftCatData = [
    { slug: "drone", name: "无人机" },
    { slug: "evtol", name: "电动垂直起降" },
    { slug: "helicopter", name: "直升机" },
    { slug: "business-jet", name: "公务机" },
  ];
  for (const c of aircraftCatData) {
    const id = uid("cat");
    CATEGORY_IDS.push(id);
    await db.insert(aircraftCategoriesTable).values({ id, slug: c.slug, name: c.name, sortOrder: aircraftCatData.indexOf(c) + 1, isEnabled: true });
  }

  // 5. 动力类型 (4)
  console.log("   创建动力类型...");
  await db.insert(powerTypesTable).values([
    { id: "seed_pwt_electric", slug: "electric", name: "电动", sortOrder: 1, isEnabled: true },
    { id: "seed_pwt_fuel", slug: "fuel", name: "燃油", sortOrder: 2, isEnabled: true },
    { id: "seed_pwt_hybrid", slug: "hybrid", name: "混动", sortOrder: 3, isEnabled: true },
    { id: "seed_pwt_other", slug: "other", name: "其他", sortOrder: 4, isEnabled: true },
  ]);

  // 6. 品牌 (15)
  console.log("   创建品牌...");
  for (const b of BRAND_DATA) {
    const id = uid("brand");
    BRAND_IDS.push(id);
    await db.insert(brandsTable).values({
      id, slug: b.slug, name: b.name,
      categoryId: CATEGORY_IDS[b.categoryIdx],
      sortOrder: BRAND_DATA.indexOf(b) + 1,
      isEnabled: true,
    });
  }
  console.log(`  品牌: ${BRAND_IDS.length} 个`);

  // 7. 机型 (30)
  console.log("   创建 30 个机型...");
  const lifecycleStatuses = ["concept", "development", "testing", "released", "marketed"] as const;
  for (const m of MODEL_DATA) {
    const id = uid("model");
    MODEL_IDS.push(id);
    await db.insert(aircraftModelsTable).values({
      id, slug: m.slug, name: m.name,
      categoryId: CATEGORY_IDS[m.catIdx],
      brandId: BRAND_IDS[m.brandIdx],
      ownerId: pick(regularUsers),
      powerType: m.power,
      lifecycleStatus: pick(lifecycleStatuses),
      summary: pick(["经典机型，性能稳定", "新一代飞行器代表", "市场热门机型", "技术创新典范", "行业标杆产品"]),
      description: `${m.name} 是一款${m.power === "electric" ? "电动" : "燃油"}飞行器，${m.flight ? `续航 ${m.flight} 分钟` : ""}。`,
      priceMin: m.priceMin, priceMax: m.priceMax,
      maxFlightTimeMinutes: m.flight || null,
      maxRangeKilometers: m.range || null,
      maxSpeedKph: m.speed || null,
      takeoffWeightGrams: m.weight || null,
      coverImageFileId: null,
      galleryImageFileIds: "[]",
      videoFileId: null,
      reportCount: 0,
      viewCount: randInt(0, 5000),
      isPublished: true,
    });
  }
  console.log(`  机型: ${MODEL_IDS.length} 个`);

  // 8. 文件记录（头像、封面、内容图）
  console.log("   创建文件记录...");
  const fileEntries: Array<{
    id: string; ownerId: string; postId: string | null; bizType: string;
    mediaKind: string; provider: string; bucket: string; region: string;
    objectKey: string; filename: string;
    contentType: string; size: number;
  }> = [];

  // 头像文件记录
  const avatarFileIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const fileId = uid("file");
    avatarFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: USER_IDS[i], postId: null,
      bizType: "avatar", mediaKind: "image",
      ...buildKodoFileRecord(i % 2 === 0 ? "测试头像1.jpg" : "测试头像2.jpg"),
      filename: i % 2 === 0 ? "测试头像1.jpg" : "测试头像2.jpg",
      contentType: "image/jpeg", size: i % 2 === 0 ? 50000 : 48000,
    });
  }

  // 机型封面文件记录
  const modelCoverFileIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const fileId = uid("file");
    modelCoverFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: pick(regularUsers), postId: null,
      bizType: "aircraft-cover-image", mediaKind: "image",
      ...buildKodoFileRecord(`封面图${(i % 4) + 1}.webp`),
      filename: `封面图${(i % 4) + 1}.webp`,
      contentType: "image/webp", size: 100000,
    });
  }

  // 圈子封面文件记录
  const circleCoverFileIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const fileId = uid("file");
    circleCoverFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: adminId, postId: null,
      bizType: "circle-cover-image", mediaKind: "image",
      ...buildKodoFileRecord(`封面图${(i % 4) + 1}.webp`),
      filename: `封面图${(i % 4) + 1}.webp`,
      contentType: "image/webp", size: 100000,
    });
  }

  // 帖子封面和内容图文件记录（稍后在创建帖子时填充 postId）
  const postCoverFileIds: string[] = [];
  const postContentFileIds: string[] = [];
  for (let i = 0; i < 200; i++) {
    const coverFileId = uid("file");
    const contentFileId = uid("file");
    postCoverFileIds.push(coverFileId);
    postContentFileIds.push(contentFileId);

    fileEntries.push({
      id: coverFileId, ownerId: regularUsers[i % regularUsers.length], postId: null,
      bizType: "post-image", mediaKind: "image",
      ...buildKodoFileRecord(`封面图${(i % 4) + 1}.webp`),
      filename: `封面图${(i % 4) + 1}.webp`,
      contentType: "image/webp", size: 100000,
    });
    fileEntries.push({
      id: contentFileId, ownerId: regularUsers[i % regularUsers.length], postId: null,
      bizType: "post-image", mediaKind: "image",
      ...buildKodoFileRecord("文章测试图.jpg"),
      filename: "文章测试图.jpg",
      contentType: "image/jpeg", size: 200000,
    });
  }

  // 机型视频文件记录
  const modelVideoFileIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const fileId = uid("file");
    modelVideoFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: pick(regularUsers), postId: null,
      bizType: "aircraft-video", mediaKind: "video",
      ...buildKodoFileRecord("测试视频.mp4"),
      filename: "测试视频.mp4",
      contentType: "video/mp4", size: 5124390,
    });
  }

  // 机型图库文件记录（每个机型 2-4 张）
  const modelGalleryFileIds: string[][] = [];
  for (let i = 0; i < 30; i++) {
    const galleryCount = randInt(2, 4);
    const galleryIds: string[] = [];
    for (let g = 0; g < galleryCount; g++) {
      const fileId = uid("file");
      galleryIds.push(fileId);
      fileEntries.push({
        id: fileId, ownerId: pick(regularUsers), postId: null,
        bizType: "aircraft-gallery-image", mediaKind: "image",
        ...buildKodoFileRecord(`封面图${(g % 4) + 1}.webp`),
        filename: `封面图${(g % 4) + 1}.webp`,
        contentType: "image/webp", size: 120000,
      });
    }
    modelGalleryFileIds.push(galleryIds);
  }

  // 视频文件记录（圈子帖子视频用）
  const postVideoFileIds: string[] = [];
  for (let i = 0; i < 30; i++) {
    const fileId = uid("file");
    postVideoFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: regularUsers[i % regularUsers.length], postId: null,
      bizType: "post-video", mediaKind: "video",
      ...buildKodoFileRecord("测试视频.mp4"),
      filename: "测试视频.mp4",
      contentType: "video/mp4", size: 5124390,
    });
  }

  // 榜单封面和条目文件记录
  const rankingCoverFileIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const fileId = uid("file");
    rankingCoverFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: adminId, postId: null,
      bizType: "ranking-cover-image", mediaKind: "image",
      ...buildKodoFileRecord(`封面图${(i % 4) + 1}.webp`),
      filename: `封面图${(i % 4) + 1}.webp`,
      contentType: "image/webp", size: 100000,
    });
  }

  const rankingItemFileIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const fileId = uid("file");
    rankingItemFileIds.push(fileId);
    fileEntries.push({
      id: fileId, ownerId: adminId, postId: null,
      bizType: "ranking-item-image", mediaKind: "image",
      ...buildKodoFileRecord(`封面图${(i % 4) + 1}.webp`),
      filename: `封面图${(i % 4) + 1}.webp`,
      contentType: "image/webp", size: 80000,
    });
  }

  // 批量插入文件记录
  for (let i = 0; i < fileEntries.length; i += 50) {
    await db.insert(filesTable).values(fileEntries.slice(i, i + 50).map(f => ({
      ...f,
      etag: null,
      status: "uploaded",
      currentAuditStatus: "passed",
      visibility: "public",
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      uploadedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      deletedAt: null,
    })));
  }
  console.log(`  文件记录: ${fileEntries.length} 个`);

  // 更新用户头像
  for (let i = 0; i < Math.min(avatarFileIds.length, regularUsers.length); i++) {
    await db.update(usersTable).set({ avatarFileId: avatarFileIds[i] }).where(sql`id = ${regularUsers[i]}`);
  }
  // admin 使用末尾的头像 ID，避免与 regularUsers[0] 冲突
  await db.update(usersTable).set({ avatarFileId: avatarFileIds[avatarFileIds.length - 1] || null }).where(sql`id = ${adminId}`);
  console.log("  用户头像已关联");

  // 更新机型封面、视频和图库
  for (let i = 0; i < Math.min(modelCoverFileIds.length, MODEL_IDS.length); i++) {
    await db.update(aircraftModelsTable).set({
      coverImageFileId: modelCoverFileIds[i],
      videoFileId: modelVideoFileIds[i] || null,
      galleryImageFileIds: JSON.stringify(modelGalleryFileIds[i] || []),
    }).where(sql`id = ${MODEL_IDS[i]}`);
  }
  console.log("  机型封面、视频和图库已关联");

  // 9. 圈子 (10)
  console.log("   创建 10 个圈子...");
  const circleSeeds = [
    { slug: "drone-enthusiasts", name: "航模发烧友", desc: "热爱航模飞行的爱好者聚集地", joinMode: "free" as const },
    { slug: "fpv-racing", name: "FPV竞速圈", desc: "穿越机竞速与技巧交流", joinMode: "free" as const },
    { slug: "aerial-photography", name: "航拍摄影", desc: "分享航拍作品与摄影技巧", joinMode: "free" as const },
    { slug: "diy-build", name: "DIY装机", desc: "自组无人机方案与调试交流", joinMode: "free" as const },
    { slug: "industry-application", name: "行业应用", desc: "测绘/巡检/植保等工业应用讨论", joinMode: "audit" as const },
    { slug: "evtol-news", name: "eVTOL前沿", desc: "eVTOL飞行器技术与资讯", joinMode: "free" as const },
    { slug: "flight-training", name: "飞行训练", desc: "飞行技术培训与考证指导", joinMode: "free" as const },
    { slug: "aerial-video", name: "航拍视频", desc: "航拍视频创作与后期制作", joinMode: "free" as const },
    { slug: "drone-racing", name: "竞速赛事", desc: "无人机竞速赛事信息与交流", joinMode: "free" as const },
    { slug: "low-altitude", name: "低空经济", desc: "低空经济政策与产业发展", joinMode: "audit" as const },
  ];

  for (let i = 0; i < circleSeeds.length; i++) {
    const c = circleSeeds[i];
    const id = uid("circle");
    CIRCLE_IDS.push(id);
    await db.insert(circlesTable).values({
      id, slug: c.slug, name: c.name, description: c.desc,
      coverImageFileId: circleCoverFileIds[i],
      ownerId: adminId, joinMode: c.joinMode,
      memberCount: randInt(5, 30), postCount: 20,
    });
    await db.insert(circleMembersTable).values({ id: uid("cm"), circleId: id, userId: adminId, role: "owner" });
    const memberCount = randInt(3, 8);
    const members = new Set<string>();
    for (let j = 0; j < memberCount; j++) {
      const memberId = pick(regularUsers);
      if (members.has(memberId)) continue;
      members.add(memberId);
      await db.insert(circleMembersTable).values({ id: uid("cm"), circleId: id, userId: memberId, role: "member" }).onConflictDoNothing();
    }
  }
  console.log(`  圈子: ${CIRCLE_IDS.length} 个`);

  // 10. 帖子 (200: 150 文章 + 50 动态)
  console.log("   创建 200 篇帖子...");
  const allPostIds: string[] = [];
  const posts: Array<Record<string, unknown>> = [];

  for (let i = 0; i < 200; i++) {
    const id = uid("post");
    allPostIds.push(id);
    const authorId = pick(regularUsers);
    const isArticle = i < 150;
    const catId = isArticle ? CONTENT_CAT_IDS[i % CONTENT_CAT_IDS.length] : null;
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const status = "published";

    posts.push({
      id, authorId,
      type: isArticle ? "article" : "moment",
      title: isArticle ? ARTICLE_TITLES[i % ARTICLE_TITLES.length] : `${pick(USER_DISPLAY_NAMES.slice(0, 20))}的${MOMENT_TITLES[(i - 150) % MOMENT_TITLES.length]}`,
      content: isArticle ? `这是第 ${i + 1} 篇测试文章的正文内容。${REVIEW_CONTENTS[i % REVIEW_CONTENTS.length]}` : `${COMMENT_CONTENTS[i % COMMENT_CONTENTS.length]} 今天天气不错，飞了一圈。`,
      contentHtml: isArticle ? `<p>${ARTICLE_TITLES[i % ARTICLE_TITLES.length]}</p><p>${REVIEW_CONTENTS[i % REVIEW_CONTENTS.length]}</p>` : null,
      contentPlainText: isArticle ? `${ARTICLE_TITLES[i % ARTICLE_TITLES.length]} ${REVIEW_CONTENTS[i % REVIEW_CONTENTS.length]}` : `${COMMENT_CONTENTS[i % COMMENT_CONTENTS.length]} 今天天气不错，飞了一圈。`,
      contentCategoryId: catId,
      coverImageFileId: postCoverFileIds[i],
      status,
      rejectionReason: null,
      commentCount: randInt(3, 5),
      reportCount: 0,
      likeCount: randInt(0, 80),
      favoriteCount: randInt(0, 40),
      shareCount: randInt(0, 15),
      viewCount: randInt(0, 2000),
      createdAt, updatedAt: createdAt, publishedAt: createdAt,
    });
  }

  for (let i = 0; i < posts.length; i += 50) {
    await db.insert(postsTable).values(posts.slice(i, i + 50));
  }
  console.log(`  帖子: ${posts.length} 个 (文章 150 + 动态 50)`);

  // 关联帖子图片文件记录的 postId
  for (let i = 0; i < 200; i++) {
    await db.update(filesTable).set({ postId: allPostIds[i] }).where(sql`id = ${postCoverFileIds[i]}`);
    await db.update(filesTable).set({ postId: allPostIds[i] }).where(sql`id = ${postContentFileIds[i]}`);
  }
  console.log("  帖子图片已关联");

  // 11. 评论 (每个帖子 3-5 条)
  console.log("   创建帖子评论...");
  const commentEntries: Array<Record<string, unknown>> = [];
  const commentIdsByPost = new Map<string, string[]>();

  for (let i = 0; i < 200; i++) {
    const postId = allPostIds[i];
    const commentCount = randInt(3, 5);
    const postCommentIds: string[] = [];

    for (let j = 0; j < commentCount; j++) {
      const id = uid("pcomment");
      postCommentIds.push(id);
      const isReply = j > 0 && Math.random() > 0.6;
      const parentCommentId = isReply && postCommentIds.length > 1
        ? postCommentIds[Math.floor(Math.random() * (postCommentIds.length - 1))]
        : null;

      commentEntries.push({
        id, postId,
        authorId: pick(regularUsers),
        parentCommentId,
        replyToCommentId: parentCommentId,
        replyToUserId: parentCommentId ? pick(regularUsers) : null,
        content: COMMENT_CONTENTS[(i * 5 + j) % COMMENT_CONTENTS.length],
        status: "visible",
        likeCount: randInt(0, 20),
        reportCount: 0,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
        updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      });
    }
    commentIdsByPost.set(postId, postCommentIds);
  }

  for (let i = 0; i < commentEntries.length; i += 50) {
    await db.insert(postCommentsTable).values(commentEntries.slice(i, i + 50));
  }
  console.log(`  评论: ${commentEntries.length} 条`);

  // 12. 榜单 (5 个，每个 10 个条目)
  console.log("   创建 5 个榜单...");
  const rankingIds: string[] = [];
  const allRatingTargetIds: string[] = [];

  for (let i = 0; i < 5; i++) {
    const id = uid("ranking");
    rankingIds.push(id);
    await db.insert(rankingsTable).values({
      id,
      authorId: adminId,
      type: i === 0 ? "official" : "community",
      title: RANKING_TITLES[i],
      description: RANKING_DESCS[i],
      status: "published",
      rejectionReason: null,
      coverImageFileId: rankingCoverFileIds[i],
      itemAddPolicy: "owner",
      commentCount: randInt(0, 10),
      reportCount: 0,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });

    for (let j = 0; j < 10; j++) {
      const itemIdx = i * 10 + j;
      const modelIdx = itemIdx % MODEL_DATA.length;
      const ratingTargetId = uid("rtarget");
      allRatingTargetIds.push(ratingTargetId);
      await db.insert(ratingTargetsTable).values({
        id: ratingTargetId,
        rankingId: id,
        authorId: adminId,
        linkedModelId: MODEL_IDS[modelIdx],
        status: "published",
        rejectionReason: null,
        rank: j + 1,
        title: `${MODEL_DATA[modelIdx].name} - ${RANKING_ITEM_TITLES[j]}`,
        summary: RANKING_ITEM_TITLES[j],
        imageFileId: rankingItemFileIds[itemIdx],
        brandName: BRAND_DATA[MODEL_DATA[modelIdx].brandIdx].name,
        commentCount: randInt(0, 5),
        likeCount: randInt(0, 25),
        reportCount: 0,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
        updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      });
    }

    await db.insert(rankingCommentsTable).values({
      id: uid("rcomment"),
      rankingId: id,
      authorId: pick(regularUsers),
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length],
      status: "visible",
      likeCount: randInt(0, 10),
      reportCount: 0,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  console.log(`  榜单: ${rankingIds.length} 个，共 ${rankingIds.length * 10} 个条目`);

  // 12.1 榜单条目评分 (每个条目 3-5 个评分)
  console.log("   创建榜单条目评分...");
  const ratingEntries: Array<{
    id: string; ratingTargetId: string; userId: string;
    rating: number; createdAt: Date; updatedAt: Date;
  }> = [];
  for (const ratingTargetId of allRatingTargetIds) {
    const ratingCount = randInt(3, 5);
    const usedUserIds = new Set<string>();
    for (let k = 0; k < ratingCount; k++) {
      let userId = pick(regularUsers);
      // 确保同一用户不对同一目标重复评分
      while (usedUserIds.has(userId)) {
        userId = pick(regularUsers);
      }
      usedUserIds.add(userId);
      const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
      ratingEntries.push({
        id: uid("rrating"),
        ratingTargetId,
        userId,
        rating: randInt(1, 5),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  for (let i = 0; i < ratingEntries.length; i += 50) {
    await db.insert(ratingTargetRatingsTable).values(ratingEntries.slice(i, i + 50));
  }
  console.log(`  榜单评分: ${ratingEntries.length} 条`);

  // 13. 用户关注 (100)
  console.log("   创建用户关注...");
  const follows = buildUniqueRows(100, () => {
    const follower = pick(regularUsers);
    const followee = pick(regularUsers);
    return {
      key: `${follower}-${followee}`,
      value: {
        id: uid("follow"),
        followerId: follower,
        followeeId: followee,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < follows.length; i += 50) {
    await db.insert(userFollowsTable).values(follows.slice(i, i + 50));
  }
  console.log(`  用户关注: ${follows.length} 条`);

  // 14. 帖子互动 (500)
  console.log("   创建帖子互动...");
  const interactionTypes = ["like", "favorite", "share"] as const;
  const interactions = buildUniqueRows(500, () => {
    const postId = pick(allPostIds);
    const userId = pick(regularUsers);
    const type = pick(interactionTypes);
    return {
      key: `${postId}:${userId}:${type}`,
      value: {
        id: uid("pinter"),
        postId, userId, type,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < interactions.length; i += 50) {
    await db.insert(postInteractionsTable).values(interactions.slice(i, i + 50));
  }
  console.log(`  帖子互动: ${interactions.length} 条`);

  // 15. 圈子帖子 (每个圈子 5 条)
  console.log("   创建圈子帖子...");
  const circlePostTitles = ["新人报到", "分享航拍作品", "求推荐入门机型", "FPV飞行记录", "DIY装机分享", "航拍调色教程", "避障实测", "远航挑战"];
  const circlePostContents = ["详细内容见图片", "和大家分享飞行体验", "欢迎交流讨论", "今天飞了一把，感觉不错", "新手求指导"];
  let circlePostCount = 0;
  const circlePostIds: string[] = [];
  for (const circleId of CIRCLE_IDS) {
    for (let j = 0; j < 5; j++) {
      // 70% 帖子有图片 (1-3 张)，30% 无图片；少数帖子用视频替代
      const hasMedia = Math.random() > 0.3;
      const useVideo = hasMedia && Math.random() > 0.8;
      const imageCount = hasMedia && !useVideo ? randInt(1, 3) : 0;
      const imageIds = Array.from({ length: imageCount }, () =>
        pick(postContentFileIds)
      );
      const videoIds = useVideo ? [pick(postVideoFileIds)] : [];

      const cpId = uid("cp");
      circlePostIds.push(cpId);
      await db.insert(circlePostsTable).values({
        id: cpId,
        circleId,
        authorId: j === 0 ? adminId : pick(regularUsers),
        title: circlePostTitles[circlePostCount % circlePostTitles.length],
        content: circlePostContents[circlePostCount % circlePostContents.length],
        images: JSON.stringify(imageIds),
        videos: JSON.stringify(videoIds),
        hotScore: randInt(10, 200),
        likeCount: randInt(0, 30),
        commentCount: randInt(0, 8),
      });
      circlePostCount++;
    }
  }
  console.log(`  圈子帖子: ${circlePostCount} 个`);

  // 15.1 圈子帖子互动（每个帖子 3-8 条点赞/收藏记录）
  console.log("   创建圈子帖子互动...");
  const circleInteractionTypes = ["like", "favorite"] as const;

  const cpIds = circlePostIds;

  const circleInteractions: Array<Record<string, unknown>> = [];
  const circleInteractionKeys = new Set<string>();
  for (const cpId of cpIds) {
    const interactionCount = randInt(3, 8);
    for (let k = 0; k < interactionCount; k++) {
      const userId = pick(regularUsers);
      const type = pick(circleInteractionTypes);
      const key = `${cpId}:${userId}:${type}`;
      if (circleInteractionKeys.has(key)) continue;
      circleInteractionKeys.add(key);
      circleInteractions.push({
        id: uid("cinter"),
        postId: cpId, userId, type,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      });
    }
  }
  for (let i = 0; i < circleInteractions.length; i += 50) {
    await db.insert(circlePostInteractionsTable).values(circleInteractions.slice(i, i + 50));
  }
  console.log(`  圈子帖子互动: ${circleInteractions.length} 条`);

  // 15.2 圈子帖子评论（每个帖子 2-5 条）
  console.log("   创建圈子帖子评论...");
  const circlePostCommentEntries: Array<Record<string, unknown>> = [];
  const circleCommentIdsByPost = new Map<string, string[]>();

  for (const cpId of cpIds) {
    const commentCount = randInt(2, 5);
    const postCommentIds: string[] = [];

    for (let j = 0; j < commentCount; j++) {
      const id = uid("ccomment");
      postCommentIds.push(id);
      const isReply = j > 0 && Math.random() > 0.6;
      const parentCommentId = isReply && postCommentIds.length > 1
        ? postCommentIds[Math.floor(Math.random() * (postCommentIds.length - 1))]
        : null;

      circlePostCommentEntries.push({
        id, postId: cpId,
        authorId: pick(regularUsers),
        parentCommentId,
        replyToCommentId: parentCommentId,
        replyToUserId: parentCommentId ? pick(regularUsers) : null,
        content: pick(COMMENT_CONTENTS),
        status: "visible",
        likeCount: randInt(0, 10),
        reportCount: 0,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
        updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      });
    }
    circleCommentIdsByPost.set(cpId, postCommentIds);
  }
  for (let i = 0; i < circlePostCommentEntries.length; i += 50) {
    await db.insert(circlePostCommentsTable).values(circlePostCommentEntries.slice(i, i + 50));
  }
  console.log(`  圈子帖子评论: ${circlePostCommentEntries.length} 条`);

  // 16. 站点设置
  console.log("   创建站点设置...");
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

  // 17. 用户设置
  console.log("   创建用户设置...");
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

  console.log("\n  PostgreSQL 推送完成！");
}

// ==================== 主函数 ====================

export async function seedMockTestDataDatabase() {
  console.log("飞加项目测试数据生成脚本");
  console.log("================================");

  await seedObjectStorage();
  await seedRedis();
  await seedPostgreSQL();

  console.log("\n================================");
  console.log("测试数据生成完成！");
  console.log("\n测试账号:");
  console.log("  管理员: admin / Admin#123");
  console.log("  普通用户: 50 个 (手机号 138 开头，短信登录)");
  console.log("\nRedis 测试数据:");
  console.log("  图形验证码: test_captcha_001 (code: TEST01)");
  console.log("  短信验证码: 13800138000 (code: 888888)");
  console.log("  注册令牌: test_reg_001");
  console.log("\nStorage: Kodo 云端存储");
}

if (import.meta.main) {
  void seedMockTestDataDatabase().catch((error) => {
    console.error("\n测试数据生成失败:", error);
    process.exit(1);
  });
}
