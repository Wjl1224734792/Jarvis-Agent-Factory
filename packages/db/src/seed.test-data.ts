/**
 * 飞加项目海量测试数据生成脚本
 *
 * 用途：向 PostgreSQL、Redis 和 MinIO 推送大量测试数据
 * 使用：bun run packages/db/src/seed.test-data.ts
 *
 * 数据规模（v2 扩容版）：
 * - 用户：200 个
 * - 飞行器分类：6 个
 * - 品牌：40 个
 * - 飞行器型号：100 个
 * - 内容分类：5 个
 * - 帖子：500 个（文章 300 + 动态 200）
 * - 帖子评论：800 条
 * - 帖子互动：1,000 条
 * - 帖子评论点赞：300 条
 * - 飞行器评测：200 条
 * - 飞行器型号评论：200 条
 * - 飞行器型号互动：300 条
 * - 排行榜：20 个
 * - 排行榜项目：150 个
 * - 排行榜评论：60 条
 * - 排行榜项目评分：500 条
 * - 排行榜项目评论：120 条
 * - 用户关注：300 条
 * - 通知：400 条
 * - 会话：100 个
 * - 飞行器提交：50 个
 * - 品牌申请：20 个
 * - 设备：60 个
 * - 文件记录：350 个
 * - 各类举报：75 条
 */

/* eslint-disable no-console */

import { createClient } from "redis";
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
  brandApplicationsTable,
  brandsTable,
  contentCategoriesTable,
  devicesTable,
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
import {
  buildSeedStorageRecord,
  resolveSeedStorageConfig,
  uploadSeedStorageObjects,
  type SeedStorageObject
} from "./seed.storage.js";
import { hashVerificationCode } from "./helpers.js";

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
  "云端摄影师", "星河飞行者", "极光航拍", "海风飞手", "城市探索家",
  "山海飞行者", "云端漫步", "雷雨飞行者", "破风飞行", "极速飞手",
  "暗夜飞行者", "晨光航拍", "暮色飞行", "蓝天守望者", "飞越地平线",
  "云中漫步", "天际漫游者", "风之翼", "光影飞行者", "时空穿梭者",
  "飞行梦想家", "航迹记录者", "云端守护者", "追风少年", "天际追踪者",
  "云海飞行家", "蓝天使者", "星际航拍", "极速穿越者", "空中画家",
  "飞行画家", "航空摄影师", "旋翼达人", "飞行探险家", "天际航拍师",
  "低空摄影师", "云中鸟", "飞行诗人", "航拍摄像师", "天空艺术",
  "云海漫游", "飞鹰航拍", "极光飞行者", "飞行哲学家", "天空旅行家",
  "风行者航拍", "飞行狂热者", "航拍观察家", "飞行顾问", "低空玩家",
  "快门飞行者", "天际艺术", "云上飞手", "飞行导航家", "低空摄手",
  "飞沙走石", "云游四方", "飞行科学家", "极客飞手", "航拍创客",
  "无人机极客", "飞行程序员", "数据飞行", "开源飞手", "DIY飞行家",
  "飞行测评君", "新品速递", "飞行开箱", "真实体验", "深度测评",
  "权威评测", "专业测评师", "飞行对比", "购机指南", "飞行情报局",
  "行业观察家", "飞行市场", "前沿科技", "未来飞行", "创新飞行",
  "绿色飞行", "新能源飞行", "可持续飞行", "碳中性航空", "环保飞行者",
  "低空经济师", "空域管理", "政策解读", "法规咨询", "合规飞行",
  "飞行安全专家", "风险管理", "应急飞行", "安全保障", "飞行保险",
  "飞行教育者", "飞行学院", "考证指导", "飞行培训", "新手导航",
  "飞行创业者", "低空商业", "飞行投资", "产业观察", "创业飞行",
  "飞行艺术家", "空中影像", "光影航拍", "视觉飞行", "创意航拍",
  "飞行故事家", "航拍纪录片", "飞行Vlog", "内容创作", "飞行自媒体",
  "社区达人", "飞行版主", "热心飞友", "飞行志愿者", "社区建设者",
  "元老飞手", "十年飞行", "资深玩家", "飞行先驱", "航拍前辈",
  "飞行达人秀", "航拍比赛", "飞行竞技", "无人机竞速", "飞行挑战",
  "国际飞手", "环球航拍", "世界飞行", "跨境飞行", "全球视角",
];

const CATEGORY_IDS: string[] = [];
const CATEGORY_DATA = [
  { slug: "multirotor", name: "多旋翼" },
  { slug: "fixed-wing", name: "固定翼" },
  { slug: "evtol", name: "eVTOL" },
  { slug: "helicopter", name: "直升机" },
  { slug: "hybrid-vtol", name: "混合垂直起降" },
  { slug: "personal-air-vehicle", name: "个人飞行器" },
];

const BRAND_IDS: string[] = [];
const BRAND_DATA = [
  { slug: "dji", name: "DJI 大疆", categoryIdx: 0 },
  { slug: "autel", name: "Autel 道通", categoryIdx: 0 },
  { slug: "hubsan", name: "Hubsan 哈博森", categoryIdx: 0 },
  { slug: "fimi", name: "FIMI 飞米", categoryIdx: 0 },
  { slug: "potensic", name: "Potensic", categoryIdx: 0 },
  { slug: "parrot", name: "Parrot 派诺特", categoryIdx: 0 },
  { slug: "skydio", name: "Skydio", categoryIdx: 0 },
  { slug: "yuneec", name: "Yuneec 昊翔", categoryIdx: 0 },
  { slug: "ryze", name: "Ryze 睿炽", categoryIdx: 0 },
  { slug: "zerotech", name: "ZeroTech 零度", categoryIdx: 0 },
  { slug: "ehang", name: "EHang 亿航", categoryIdx: 2 },
  { slug: "joby", name: "Joby Aviation", categoryIdx: 2 },
  { slug: "volocopter", name: "Volocopter", categoryIdx: 2 },
  { slug: "lilium", name: "Lilium", categoryIdx: 2 },
  { slug: "archer", name: "Archer Aviation", categoryIdx: 2 },
  { slug: "wisk", name: "Wisk Aero", categoryIdx: 2 },
  { slug: "beta", name: "Beta Technologies", categoryIdx: 2 },
  { slug: "supernal", name: "Supernal", categoryIdx: 2 },
  { slug: "robinson", name: "Robinson 罗宾逊", categoryIdx: 3 },
  { slug: "airbus-heli", name: "Airbus Helicopters", categoryIdx: 3 },
  { slug: "bell", name: "Bell 贝尔", categoryIdx: 3 },
  { slug: "leonardo", name: "Leonardo 莱昂纳多", categoryIdx: 3 },
  { slug: "sikorsky", name: "Sikorsky 西科斯基", categoryIdx: 3 },
  { slug: "cirrus", name: "Cirrus 西锐", categoryIdx: 1 },
  { slug: "embraer", name: "Embraer 巴航工业", categoryIdx: 1 },
  { slug: "textron", name: "Textron Aviation", categoryIdx: 1 },
  { slug: "pipistrel", name: "Pipistrel 蝙蝠", categoryIdx: 1 },
  { slug: "diamond", name: "Diamond 钻石", categoryIdx: 1 },
  { slug: "xpeng-aero", name: "小鹏汇天", categoryIdx: 2 },
  { slug: "auto-flight", name: "峰飞航空", categoryIdx: 2 },
  { slug: "tcab", name: "TCAB 太力", categoryIdx: 2 },
  { slug: "vertical", name: "Vertical Aerospace", categoryIdx: 2 },
  { slug: "aerofugia", name: "沃飞长空", categoryIdx: 2 },
  { slug: "shangfeng", name: "上飞航空", categoryIdx: 5 },
  { slug: "jetx", name: "JetX 捷行", categoryIdx: 5 },
  { slug: "skyvue", name: "SkyVue 天景", categoryIdx: 4 },
  { slug: "pal-v", name: "PAL-V", categoryIdx: 4 },
  { slug: "aero-mobil", name: "AeroMobil", categoryIdx: 4 },
  { slug: "samad", name: "Samad Aerospace", categoryIdx: 2 },
  { slug: "heaviside", name: "Heaviside 灵翼", categoryIdx: 2 },
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
  { slug: "vision-jet", name: "Cirrus Vision Jet G2+", brandIdx: 13, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 300, range: 2300, speed: 576, weight: null },
  { slug: "phenom-300e", name: "Embraer Phenom 300E", brandIdx: 14, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 240, range: 3700, speed: 860, weight: null },
  { slug: "xpeng-x3", name: "小鹏汇天陆地航母", brandIdx: 16, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 30, range: 50, speed: 130, weight: null },
  { slug: "autoflight-prosperity", name: "峰飞盛世龙", brandIdx: 17, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 45, range: 250, speed: 200, weight: null },
  { slug: "tcab-transition", name: "太力 Transition", brandIdx: 18, catIdx: 2, power: "fuel", priceMin: null, priceMax: null, flight: 120, range: 800, speed: 180, weight: null },
  { slug: "va-x4", name: "Vertical VA-X4", brandIdx: 19, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 40, range: 160, speed: 320, weight: null },
  { slug: "dji-agras-t50", name: "DJI Agras T50", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 69999, priceMax: 89999, flight: 20, range: 5, speed: 36, weight: 40000 },
  { slug: "dji-mavic-3-classic", name: "DJI Mavic 3 Classic", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 10499, priceMax: 12888, flight: 46, range: 30, speed: 75, weight: 895 },
  { slug: "dji-mini-3-pro", name: "DJI Mini 3 Pro", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 3999, priceMax: 5499, flight: 34, range: 18, speed: 57, weight: 249 },
  { slug: "dji-phantom-4-rtk", name: "DJI Phantom 4 RTK", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 29999, priceMax: 42999, flight: 30, range: 7, speed: 72, weight: 1391 },
  { slug: "autel-evo-ii-pro", name: "Autel EVO II Pro V3", brandIdx: 1, catIdx: 0, power: "electric", priceMin: 11999, priceMax: 15999, flight: 40, range: 25, speed: 72, weight: 1190 },
  { slug: "hubsan-ace-pro", name: "Hubsan Ace Pro", brandIdx: 2, catIdx: 0, power: "electric", priceMin: 3499, priceMax: 4499, flight: 32, range: 10, speed: 58, weight: 460 },
  { slug: "parrot-anafi-ai", name: "Parrot Anafi Ai", brandIdx: 5, catIdx: 0, power: "electric", priceMin: 24999, priceMax: 34999, flight: 32, range: 20, speed: 60, weight: 898 },
  { slug: "skydio-x10", name: "Skydio X10", brandIdx: 6, catIdx: 0, power: "electric", priceMin: 49999, priceMax: 69999, flight: 40, range: 12, speed: 72, weight: 1490 },
  { slug: "yuneec-h520e", name: "Yuneec H520E", brandIdx: 7, catIdx: 0, power: "electric", priceMin: 32999, priceMax: 44999, flight: 28, range: 8, speed: 45, weight: 2245 },
  { slug: "ryze-tello", name: "Ryze Tello", brandIdx: 8, catIdx: 0, power: "electric", priceMin: 699, priceMax: 999, flight: 13, range: 0, speed: 28, weight: 80 },
  { slug: "zerotech-dobby", name: "ZeroTech Dobby", brandIdx: 9, catIdx: 0, power: "electric", priceMin: 1799, priceMax: 2399, flight: 9, range: 0, speed: 25, weight: 199 },
  { slug: "wisk-cora", name: "Wisk Cora", brandIdx: 15, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 40, range: 100, speed: 180, weight: null },
  { slug: "beta-alia-250", name: "Beta Alia-250", brandIdx: 16, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 60, range: 463, speed: 275, weight: null },
  { slug: "supernal-sa1", name: "Supernal SA-1", brandIdx: 17, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 96, speed: 260, weight: null },
  { slug: "leonardo-aw609", name: "Leonardo AW609", brandIdx: 21, catIdx: 4, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 1389, speed: 509, weight: null },
  { slug: "sikorsky-s76", name: "Sikorsky S-76D", brandIdx: 22, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 150, range: 760, speed: 287, weight: null },
  { slug: "pipistrel-panthera", name: "Pipistrel Panthera", brandIdx: 26, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 240, range: 1850, speed: 370, weight: 1315 },
  { slug: "diamond-da62", name: "Diamond DA62", brandIdx: 27, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 2350, speed: 350, weight: null },
  { slug: "aerofugia-ae200", name: "沃飞长空 AE200", brandIdx: 32, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 40, range: 200, speed: 250, weight: null },
  { slug: "shangfeng-sf1", name: "上飞航空 SF-1", brandIdx: 33, catIdx: 5, power: "electric", priceMin: null, priceMax: null, flight: 25, range: 50, speed: 120, weight: null },
  { slug: "jetx-j1", name: "JetX J1", brandIdx: 34, catIdx: 5, power: "electric", priceMin: null, priceMax: null, flight: 20, range: 40, speed: 100, weight: null },
  { slug: "skyvue-x1", name: "SkyVue X1", brandIdx: 35, catIdx: 4, power: "hybrid", priceMin: null, priceMax: null, flight: 90, range: 500, speed: 180, weight: null },
  { slug: "pal-v-liberty", name: "PAL-V Liberty", brandIdx: 36, catIdx: 4, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 500, speed: 180, weight: null },
  { slug: "aero-mobil-am4", name: "AeroMobil AM4", brandIdx: 37, catIdx: 4, power: "hybrid", priceMin: null, priceMax: null, flight: 200, range: 740, speed: 260, weight: null },
  { slug: "samad-starling", name: "Samad Starling", brandIdx: 38, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 30, range: 80, speed: 220, weight: null },
  { slug: "heaviside-hx1", name: "Heaviside HX-1", brandIdx: 39, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 50, range: 160, speed: 290, weight: null },
  { slug: "dji-fpv-2", name: "DJI FPV 2", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 4299, priceMax: 6299, flight: 20, range: 12, speed: 140, weight: 410 },
  { slug: "autel-dragonfish", name: "Autel Dragonfish", brandIdx: 1, catIdx: 1, power: "electric", priceMin: 89999, priceMax: 139999, flight: 120, range: 30, speed: 108, weight: 4600 },
  { slug: "parrot-disco", name: "Parrot Disco", brandIdx: 5, catIdx: 1, power: "electric", priceMin: 4999, priceMax: 6999, flight: 45, range: 12, speed: 80, weight: 750 },
  { slug: "eh216-l", name: "EHang EH216-L", brandIdx: 10, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 60, speed: 150, weight: null },
  { slug: "bell-429", name: "Bell 429 GlobalRanger", brandIdx: 20, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 760, speed: 280, weight: null },
  { slug: "pipistrel-velis", name: "Pipistrel Velis Electro", brandIdx: 26, catIdx: 1, power: "electric", priceMin: 299999, priceMax: 399999, flight: 50, range: 180, speed: 180, weight: 600 },
  { slug: "volocopter-volocity", name: "Volocopter VoloCity", brandIdx: 12, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 20, range: 35, speed: 110, weight: null },
  { slug: "archer-maker", name: "Archer Maker", brandIdx: 14, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 30, range: 80, speed: 240, weight: null },
  { slug: "skydio-s2", name: "Skydio S2+", brandIdx: 6, catIdx: 0, power: "electric", priceMin: 29999, priceMax: 39999, flight: 27, range: 6, speed: 58, weight: 800 },
  { slug: "yuneec-typhoon-h3", name: "Yuneec Typhoon H3", brandIdx: 7, catIdx: 0, power: "electric", priceMin: 8999, priceMax: 12999, flight: 25, range: 10, speed: 70, weight: 1950 },
  { slug: "dji-matrice-30", name: "DJI Matrice 30", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 49999, priceMax: 69999, flight: 41, range: 15, speed: 82, weight: 3998 },
  { slug: "dji-matrice-300", name: "DJI Matrice 300 RTK", brandIdx: 0, catIdx: 0, power: "electric", priceMin: 79999, priceMax: 109999, flight: 55, range: 15, speed: 82, weight: 4700 },
  { slug: "diamond-da40", name: "Diamond DA40 NG", brandIdx: 27, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 240, range: 1300, speed: 280, weight: 1280 },
  { slug: "textron-latitude", name: "Textron Citation Latitude", brandIdx: 25, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 300, range: 5000, speed: 890, weight: null },
  { slug: "embraer-praetor", name: "Embraer Praetor 600", brandIdx: 24, catIdx: 1, power: "fuel", priceMin: null, priceMax: null, flight: 300, range: 7400, speed: 863, weight: null },
  { slug: "fimi-x8pro", name: "FIMI X8 Pro", brandIdx: 3, catIdx: 0, power: "electric", priceMin: 4999, priceMax: 6999, flight: 40, range: 15, speed: 68, weight: 820 },
  { slug: "potensic-dreamer", name: "Potensic Dreamer Pro", brandIdx: 4, catIdx: 0, power: "electric", priceMin: 2999, priceMax: 3999, flight: 30, range: 8, speed: 55, weight: 650 },
  { slug: "xpeng-x2", name: "小鹏汇天旅航者X2", brandIdx: 28, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 35, range: 75, speed: 130, weight: null },
  { slug: "autoflight-v1500", name: "峰飞 V1500M", brandIdx: 29, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 50, range: 200, speed: 200, weight: null },
  { slug: "robinson-r22", name: "Robinson R22 Beta", brandIdx: 18, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 120, range: 370, speed: 180, weight: 635 },
  { slug: "airbus-h125", name: "Airbus H125", brandIdx: 19, catIdx: 3, power: "fuel", priceMin: null, priceMax: null, flight: 180, range: 630, speed: 260, weight: null },
  { slug: "hubsan-h501s", name: "Hubsan H501S", brandIdx: 2, catIdx: 0, power: "electric", priceMin: 1399, priceMax: 1799, flight: 20, range: 5, speed: 55, weight: 410 },
  { slug: "zerotech-falcon", name: "ZeroTech Falcon", brandIdx: 9, catIdx: 0, power: "electric", priceMin: 2999, priceMax: 4199, flight: 28, range: 6, speed: 60, weight: 550 },
  { slug: "vertical-va1x", name: "Vertical VA-1X", brandIdx: 31, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 45, range: 160, speed: 320, weight: null },
  { slug: "lilium-jet-7", name: "Lilium Jet 7-Seater", brandIdx: 13, catIdx: 2, power: "electric", priceMin: null, priceMax: null, flight: 70, range: 250, speed: 280, weight: null },
];

const CONTENT_CAT_IDS: string[] = [];
const CONTENT_CAT_DATA = [
  { slug: "news", name: "资讯" },
  { slug: "review", name: "评测" },
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

// ==================== Object Storage ====================

async function seedObjectStorage() {
  console.log("\n📦 开始推送对象存储测试数据...");

  const config = resolveSeedStorageConfig();
  FILE_KEYS.length = 0;
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

  const objects: SeedStorageObject[] = [];
  for (const cat of categories) {
    for (let i = 0; i < cat.count; i++) {
      const key = `test/${cat.prefix}/${cat.prefix.split("/").pop()}-${String(i + 1).padStart(3, "0")}.${cat.type === "video/mp4" ? "mp4" : "png"}`;
      objects.push({
        key,
        body: cat.data,
        contentType: cat.type
      });
      FILE_KEYS.push(key);
    }
  }

  const total = objects.length;
  await uploadSeedStorageObjects(config, objects);

  console.log(`  ✅ ${config.provider} 推送完成，共 ${total} 个文件`);
}

// ==================== Redis ====================

async function seedRedis() {
  console.log("\n🗄️ 开始推送 Redis 测试数据...");

  const client = createClient({
    url: process.env.REDIS_URL?.trim() || "redis://localhost:6379/0",
  });
  await client.connect();

  try {
    const codeHashSecret = resolveSeedAuthCodeHashSecret();

    // 验证码
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
    await client.set("captcha:test_captcha_002", JSON.stringify({
      challengeId: "test_captcha_002",
      codeHash: hashVerificationCode({
        code: "ABCD",
        purpose: "captcha",
        subject: "test_captcha_002",
        secret: codeHashSecret
      }),
      attempts: 0
    }), { EX: 300 });
    console.log("  ✓ 图形验证码: 2 组");

    // 短信验证码
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
    await client.set("sms:13800138001", JSON.stringify({
      requestId: "test_sms_002",
      phone: "13800138001",
      codeHash: hashVerificationCode({
        code: "666666",
        purpose: "sms",
        subject: "13800138001",
        secret: codeHashSecret
      }),
      attempts: 0
    }), { EX: 300 });
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
      "notifications", "user_settings", "sessions", "devices", "users"
      RESTART IDENTITY CASCADE;`
  ));
  console.log("  ✓ 清理完成");

  // 1. 用户 (200)
  console.log("  👥 创建 200 个用户...");
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
    regularUsers.slice(0, 120).map((userId) => ({
      id: uid("setting"), userId,
      profileVisibility: pick(["public", "community", "private"]),
      notifyComments: Math.random() > 0.3,
      notifyMentions: Math.random() > 0.4,
      sessionAlerts: Math.random() > 0.2,
      emailDigest: Math.random() > 0.7,
    }))
  );
  console.log("  ✓ 用户设置: 120 个");

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

  // 5. 飞行器型号 (100)
  console.log("  ✈️ 创建飞行器型号...");
  const lifecycleStatuses = ["concept", "development", "testing", "unreleased", "released", "not_in_market", "marketed"] as const;
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
      description: `${m.name} 是一款${m.power === "electric" ? "电动" : "燃油"}飞行器，${m.flight ? `续航 ${m.flight} 分钟` : ""}，${m.range ? `航程 ${m.range} 公里` : ""}，${m.speed ? `最高时速 ${m.speed} km/h` : ""}。`,
      priceMin: m.priceMin, priceMax: m.priceMax,
      maxFlightTimeMinutes: m.flight || null,
      maxRangeKilometers: m.range || null,
      maxSpeedKph: m.speed || null,
      takeoffWeightGrams: m.weight || null,
      coverImageFileId: null,
      galleryImageFileIds: "[]",
      videoFileId: null,
      reportCount: randInt(0, 3),
      viewCount: randInt(0, 5000),
      isPublished: Math.random() > 0.1,
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
  const storage = resolveSeedStorageConfig();
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
      ...buildSeedStorageRecord(storage, key),
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

  // 8. 帖子 (500: 300 文章 + 200 动态)
  console.log("  📝 创建帖子...");
  const articlePostIds: string[] = [];
  const momentPostIds: string[] = [];
  const pendingPostIds: string[] = [];
  const rejectedPostIds: string[] = [];
  const allPostIds: string[] = [];

  const posts = [];
  for (let i = 0; i < 300; i++) {
    const id = uid("post");
    const authorId = pick(regularUsers);
    const status = i < 240 ? "published" : i < 270 ? "pending" : "rejected";
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
      likeCount: randInt(0, 80),
      favoriteCount: randInt(0, 40),
      shareCount: randInt(0, 15),
      createdAt, updatedAt: createdAt, publishedAt,
    });
  }

  for (let i = 0; i < 200; i++) {
    const id = uid("post");
    const authorId = pick(regularUsers);
    const status = i < 170 ? "published" : i < 190 ? "pending" : "hidden";
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));

    if (status === "published") momentPostIds.push(id);
    if (status === "pending") pendingPostIds.push(id);
    allPostIds.push(id);

    posts.push({
      id, authorId, type: "moment" as const,
      title: `${pick(USER_DISPLAY_NAMES.slice(0, 40))}的${MOMENT_TITLES[i % MOMENT_TITLES.length]}`,
      content: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length] + ` 今天天气不错，飞了一圈。`,
      contentPlainText: COMMENT_CONTENTS[i % COMMENT_CONTENTS.length] + ` 今天天气不错，飞了一圈。`,
      contentCategoryId: null,
      status, rejectionReason: null,
      commentCount: randInt(0, 8),
      reportCount: 0,
      likeCount: randInt(0, 40),
      favoriteCount: randInt(0, 20),
      shareCount: randInt(0, 8),
      createdAt, updatedAt: createdAt, publishedAt: status === "published" ? createdAt : null,
    });
  }

  for (let i = 0; i < posts.length; i += 50) {
    await db.insert(postsTable).values(posts.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子: ${posts.length} 个 (文章 300 + 动态 200)`);

  // 关联帖子图片
  const postImageFiles = fileEntries.filter(f => f.bizType === "post-image");
  for (let i = 0; i < Math.min(postImageFiles.length, allPostIds.length); i++) {
    await db.update(filesTable).set({ postId: allPostIds[i] }).where(sql`id = ${postImageFiles[i].id}`);
  }
  console.log("  ✓ 帖子图片已关联");

  // 为动态帖子设置封面（取第一张关联图片作为 coverImageFileId）
  const momentIds = momentPostIds.concat(posts.filter(p => p.type === "moment").map(p => p.id));
  const momentIdSet = new Set(momentIds);
  const coverCandidates = postImageFiles.filter(f => f.postId && momentIdSet.has(f.postId));
  const coverByPostId = new Map<string, string>();
  for (const file of coverCandidates) {
    if (file.postId && !coverByPostId.has(file.postId)) {
      coverByPostId.set(file.postId, file.id);
    }
  }
  for (const [postId, fileId] of coverByPostId) {
    await db.update(postsTable).set({ coverImageFileId: fileId }).where(sql`id = ${postId}`);
  }
  console.log("  ✓ 动态封面已关联");

  // 9. 帖子评论 (800)
  console.log("  💬 创建帖子评论...");
  const postComments = [];
  const commentIds: string[] = [];
  for (let i = 0; i < 800; i++) {
    const id = uid("pcomment");
    commentIds.push(id);
    const postId = pick(allPostIds);
    const authorId = pick(regularUsers);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const isReply = i > 100 && Math.random() > 0.6;
    const parentCommentId = isReply ? pick(commentIds.slice(0, Math.min(100, commentIds.length))) : null;

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

  // 10. 帖子互动 (1000)
  console.log("  ❤️ 创建帖子互动...");
  const types = ["like", "favorite", "share"] as const;
  const interactions = buildUniqueRows(1000, () => {
    const postId = pick(allPostIds);
    const userId = pick(regularUsers);
    const type = pick(types);

    return {
      key: `${postId}:${userId}:${type}`,
      value: {
        id: uid("pinter"),
        postId,
        userId,
        type,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < interactions.length; i += 50) {
    await db.insert(postInteractionsTable).values(interactions.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子互动: ${interactions.length} 条`);

  // 11. 帖子评论点赞 (300)
  console.log("  👍 创建帖子评论点赞...");
  const commentLikes = buildUniqueRows(300, () => {
    const commentId = pick(commentIds);
    const userId = pick(regularUsers);

    return {
      key: `${commentId}:${userId}`,
      value: {
        id: uid("clike"),
        commentId,
        userId,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < commentLikes.length; i += 50) {
    await db.insert(postCommentLikesTable).values(commentLikes.slice(i, i + 50));
  }
  console.log(`  ✓ 帖子评论点赞: ${commentLikes.length} 条`);

  // 12. 飞行器评测 (200)
  console.log("  ⭐ 创建飞行器评测...");
  let reviewIndex = 0;
  const reviews = buildUniqueRows(200, () => {
    const id = uid("review");
    const modelId = pick(MODEL_IDS);
    const userId = pick(regularUsers);
    const currentIndex = reviewIndex;
    reviewIndex += 1;

    return {
      key: `${modelId}:${userId}`,
      value: {
        id,
        modelId,
        userId,
        rating: randInt(1, 5),
        content: REVIEW_CONTENTS[currentIndex % REVIEW_CONTENTS.length],
        status: pick(["visible", "visible", "visible", "hidden"]),
        likeCount: randInt(0, 30),
        reportCount: randInt(0, 2),
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
        updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < reviews.length; i += 50) {
    await db.insert(aircraftReviewsTable).values(reviews.slice(i, i + 50));
  }
  console.log(`  ✓ 飞行器评测: ${reviews.length} 条`);

  // 13. 飞行器型号评论 (200)
  console.log("  🗣️ 创建飞行器型号评论...");
  const modelCommentIds: string[] = [];
  const modelComments = [];
  for (let i = 0; i < 200; i++) {
    const id = uid("mcomment");
    modelCommentIds.push(id);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const isReply = i > 60 && Math.random() > 0.6;
    const parentId = isReply ? pick(modelCommentIds.slice(0, Math.min(60, modelCommentIds.length))) : null;
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

  // 14. 飞行器型号互动 (300)
  console.log("  📌 创建飞行器型号互动...");
  const modelInteractionTypes = ["favorite", "viewed", "compared"] as const;
  const modelInteractions = buildUniqueRows(300, () => {
    const modelId = pick(MODEL_IDS);
    const userId = pick(regularUsers);
    const type = pick(modelInteractionTypes);

    return {
      key: `${modelId}:${userId}:${type}`,
      value: {
        id: uid("minter"),
        modelId,
        userId,
        type,
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
        updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < modelInteractions.length; i += 50) {
    await db.insert(aircraftModelInteractionsTable).values(modelInteractions.slice(i, i + 50));
  }
  console.log(`  ✓ 飞行器型号互动: ${modelInteractions.length} 条`);

  // 15. 排行榜 (20)
  console.log("  🏆 创建排行榜...");
  const rankingIds: string[] = [];
  const rankingCoverFiles = fileEntries.filter(f => f.bizType === "ranking-cover-image");
  for (let i = 0; i < 20; i++) {
    const id = uid("ranking");
    rankingIds.push(id);
    await db.insert(rankingsTable).values({
      id,
      authorId: pick(regularUsers),
      type: pick(["community", "community", "official"]),
      title: RANKING_TITLES[i % RANKING_TITLES.length],
      description: RANKING_DESCS[i % RANKING_DESCS.length],
      status: pick(["published", "published", "published", "pending"]),
      rejectionReason: null,
      coverImageFileId: rankingCoverFiles[i % rankingCoverFiles.length]?.id || null,
      itemAddPolicy: pick(["owner", "anyone", "moderated"]),
      commentCount: randInt(0, 10),
      reportCount: randInt(0, 2),
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  console.log(`  ✓ 排行榜: ${rankingIds.length} 个`);

  // 16. 排行榜项目 (150)
  console.log("  📊 创建排行榜项目...");
  const rankingItemIds: string[] = [];
  const rankingItemFiles = fileEntries.filter(f => f.bizType === "ranking-item-image");
  const rankingItems = [];
  for (let i = 0; i < 150; i++) {
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

  // 17. 排行榜评论 (60)
  console.log("  🗨️ 创建排行榜评论...");
  const rankingComments = [];
  for (let i = 0; i < 60; i++) {
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

  // 18. 排行榜项目评分 (500)
  console.log("  🔢 创建排行榜项目评分...");
  const ratings = buildUniqueRows(500, () => {
    const ratingTargetId = pick(rankingItemIds);
    const userId = pick(regularUsers);

    return {
      key: `${ratingTargetId}:${userId}`,
      value: {
        id: uid("rating"),
        ratingTargetId,
        userId,
        rating: randInt(1, 5),
        createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
        updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
      }
    };
  });
  for (let i = 0; i < ratings.length; i += 50) {
    await db.insert(ratingTargetRatingsTable).values(ratings.slice(i, i + 50));
  }
  console.log(`  ✓ 排行榜项目评分: ${ratings.length} 条`);

  // 19. 排行榜项目评论 (120)
  console.log("  💬 创建排行榜项目评论...");
  const rtComments = [];
  const rtCommentIds: string[] = [];
  for (let i = 0; i < 120; i++) {
    const id = uid("rtcomment");
    rtCommentIds.push(id);
    const createdAt = seededDate(randInt(1, 28), randInt(0, 23));
    const isReply = i > 30 && Math.random() > 0.6;
    const parentId = isReply ? pick(rtCommentIds.slice(0, Math.min(30, rtCommentIds.length))) : null;
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

  // 20. 用户关注 (300)
  console.log("  👥 创建用户关注...");
  const follows = [];
  const followSet = new Set<string>();
  let followCount = 0;
  while (followCount < 300) {
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

  // 21. 通知 (400)
  console.log("  🔔 创建通知...");
  const notifications = [];
  const notifTypes = [
    "followed",
    "post_commented",
    "comment_replied",
    "post_liked",
    "post_favorited",
    "post_status_changed",
    "aircraft_submission_status_changed",
    "brand_application_status_changed"
  ] as const;
  for (let i = 0; i < 400; i++) {
    const type = pick(notifTypes);
    const postId = Math.random() > 0.5 ? pick(allPostIds) : null;
    const commentId = Math.random() > 0.6 ? pick(commentIds) : null;
    const actorId = type.endsWith("_changed") ? null : pick(regularUsers);
    const category =
      type === "followed"
        ? "new_followers"
        : type === "post_liked" || type === "post_favorited"
          ? "likes_and_favorites"
          : type === "post_commented" || type === "comment_replied"
            ? "comments_and_mentions"
            : "system";
    const targetType =
      type === "followed"
        ? "user"
        : type === "aircraft_submission_status_changed"
          ? "aircraft_submission"
          : type === "brand_application_status_changed"
            ? "brand_application"
            : type === "post_status_changed"
              ? "status"
              : "post";
    const targetId =
      targetType === "user"
        ? actorId ?? pick(regularUsers)
        : targetType === "aircraft_submission"
          ? uid("submission_target")
          : targetType === "brand_application"
            ? uid("brand_app_target")
            : postId ?? pick(allPostIds);
    notifications.push({
      id: uid("notif"),
      userId: pick(regularUsers),
      actorId,
      category,
      type,
      targetType,
      targetId,
      targetTitle:
        targetType === "user"
          ? "新关注飞友"
          : targetType === "brand_application"
            ? "品牌申请状态"
            : targetType === "aircraft_submission"
              ? "机型投稿状态"
              : "相关内容",
      targetStatus: type.endsWith("_changed") ? pick(["pending", "approved", "rejected", "published"]) : null,
      title: type.endsWith("_changed") ? "系统消息" : "互动提醒",
      summary: type.endsWith("_changed") ? "内容状态已更新" : "你收到了一条新的互动消息",
      preview: commentId ? "这是一条测试评论预览" : null,
      metadata: JSON.stringify({
        href:
          targetType === "user"
            ? `/users/${targetId}`
            : targetType === "post" || targetType === "status"
              ? `/posts/${targetId}`
              : null
      }),
      postId,
      commentId,
      isRead: Math.random() > 0.6,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  for (let i = 0; i < notifications.length; i += 50) {
    await db.insert(notificationsTable).values(notifications.slice(i, i + 50));
  }
  console.log(`  ✓ 通知: ${notifications.length} 条`);

  // 22. 会话 (100)
  console.log("  🔑 创建会话...");
  const sessions = [];
  const scopes = ["web", "app"] as const;
  const devices = ["Chrome on Windows", "Safari on macOS", "FeijiaApp iOS", "FeijiaApp Android", "Firefox on Linux", "Edge on Windows"];
  for (let i = 0; i < 100; i++) {
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

  // 23. 飞行器提交 (50)
  console.log("  📤 创建飞行器提交...");
  const submissionCoverFiles = fileEntries.filter(f => f.bizType === "aircraft-cover-image");
  const submissions = [];
  const statuses = ["submitted", "submitted", "submitted", "approved", "approved", "rejected"] as const;
  for (let i = 0; i < 50; i++) {
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
  const reportablePostIds = [...pendingPostIds, ...rejectedPostIds, ...allPostIds.slice(0, 10)];
  const postReports = buildUniqueRows(15, () => {
    const postId = pick(reportablePostIds);
    const reporterId = pick(regularUsers);

    return {
      key: `${postId}:${reporterId}`,
      value: {
        id: uid("preport"),
        postId,
        reporterId,
        reason: pick(REPORT_REASONS),
        imageFileIds: JSON.stringify([]),
      }
    };
  });
  for (let i = 0; i < postReports.length; i += 50) {
    await db.insert(postReportsTable).values(postReports.slice(i, i + 50));
  }

  // 帖子评论举报 (10)
  const postCommentReports = buildUniqueRows(10, () => {
    const commentId = pick(commentIds);
    const reporterId = pick(regularUsers);

    return {
      key: `${commentId}:${reporterId}`,
      value: {
        id: uid("pcreport"),
        commentId,
        reporterId,
        reason: pick(REPORT_REASONS),
        imageFileIds: JSON.stringify([]),
      }
    };
  });
  for (let i = 0; i < postCommentReports.length; i += 50) {
    await db.insert(postCommentReportsTable).values(postCommentReports.slice(i, i + 50));
  }

  // 排行榜举报 (5)
  const rankingReports = buildUniqueRows(5, () => {
    const rankingId = pick(rankingIds);
    const reporterId = pick(regularUsers);

    return {
      key: `${rankingId}:${reporterId}`,
      value: {
        id: uid("rreport"),
        rankingId,
        reporterId,
        reason: pick(REPORT_REASONS),
        imageFileIds: JSON.stringify([]),
      }
    };
  });
  for (let i = 0; i < rankingReports.length; i += 50) {
    await db.insert(rankingReportsTable).values(rankingReports.slice(i, i + 50));
  }

  // 排行榜项目举报 (5)
  const rtReports = buildUniqueRows(5, () => {
    const ratingTargetId = pick(rankingItemIds);
    const reporterId = pick(regularUsers);

    return {
      key: `${ratingTargetId}:${reporterId}`,
      value: {
        id: uid("rtreport"),
        ratingTargetId,
        reporterId,
        reason: pick(REPORT_REASONS),
        imageFileIds: JSON.stringify([]),
      }
    };
  });
  for (let i = 0; i < rtReports.length; i += 50) {
    await db.insert(ratingTargetReportsTable).values(rtReports.slice(i, i + 50));
  }

  // 排行榜项目评论举报 (5)
  const rtCommentReports = buildUniqueRows(5, () => {
    const commentId = pick(rtCommentIds);
    const reporterId = pick(regularUsers);

    return {
      key: `${commentId}:${reporterId}`,
      value: {
        id: uid("rtcreport"),
        commentId,
        reporterId,
        reason: pick(REPORT_REASONS),
        imageFileIds: JSON.stringify([]),
      }
    };
  });
  for (let i = 0; i < rtCommentReports.length; i += 50) {
    await db.insert(ratingTargetCommentReportsTable).values(rtCommentReports.slice(i, i + 50));
  }

  console.log("  ✓ 举报数据: 帖子 15 + 评论 10 + 排行榜 5 + 项目 5 + 项目评论 5");

  // 25. 品牌申请 (20)
  console.log("  🏷️ 创建品牌申请...");
  const brandAppStatuses = ["pending", "approved", "rejected"] as const;
  for (let i = 0; i < 20; i++) {
    const status = pick(brandAppStatuses);
    await db.insert(brandApplicationsTable).values({
      id: uid("brandapp"),
      applicantId: pick(regularUsers),
      status,
      slug: `test-brand-app-${i + 1}`,
      name: `测试品牌申请 ${i + 1}`,
      logoUrl: null,
      description: `${status === "approved" ? "已通过" : status === "rejected" ? "已驳回" : "待审核"}的测试品牌申请。`,
      rejectionReason: status === "rejected" ? pick(REPORT_REASONS) : null,
      approvedBrandId: status === "approved" ? pick(BRAND_IDS) : null,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  console.log("  ✓ 品牌申请: 20 个");

  // 26. 设备 (60)
  console.log("  📱 创建设备...");
  const deviceTypes = ["ios", "android", "web"] as const;
  const deviceLabels = ["iPhone 15 Pro", "Samsung Galaxy S24", "Google Pixel 9", "iPad Pro M4", "MacBook Pro M3", "Windows Desktop"];
  for (let i = 0; i < 60; i++) {
    await db.insert(devicesTable).values({
      id: uid("device"),
      userId: pick(USER_IDS),
      deviceType: pick(deviceTypes),
      deviceLabel: pick(deviceLabels),
      pushToken: `test-push-token-${crypto.randomUUID()}`,
      createdAt: seededDate(randInt(1, 28), randInt(0, 23)),
      updatedAt: seededDate(randInt(1, 28), randInt(0, 23)),
    });
  }
  console.log("  ✓ 设备: 60 个");

  // 27. 站点设置
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
    moderationModes: "{}",
  });
  console.log("  ✓ 站点设置: 1 个");

  console.log("\n  ✅ PostgreSQL 推送完成！");
}

// ==================== 主函数 ====================

export async function seedMockTestDataDatabase() {
  const storage = resolveSeedStorageConfig();
  console.log("🚀 飞加项目海量测试数据生成脚本");
  console.log("================================");

  await seedObjectStorage();
  await seedRedis();
  await seedPostgreSQL();

  console.log("\n================================");
  console.log("🎉 测试数据生成完成！");
  console.log("\n📋 测试账号:");
  console.log("  管理员: admin / Admin#123");
  console.log("  普通用户: 200 个 (手机号 138 开头，短信登录)");
  console.log("\n🔑 Redis 测试数据:");
  console.log("  图形验证码: test_captcha_001 (code: TEST01)");
  console.log("  短信验证码: 13800138000 (code: 888888)");
  console.log("  注册令牌: test_reg_001");
  console.log(`\n📦 Storage: ${storage.provider} / ${storage.bucket} bucket, test/ 前缀`);
}

if (import.meta.main) {
  void seedMockTestDataDatabase().catch((error) => {
    console.error("\n❌ 测试数据生成失败:", error);
    process.exit(1);
  });
}
