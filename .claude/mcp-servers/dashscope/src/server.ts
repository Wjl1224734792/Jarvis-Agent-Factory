/**
 * DashScope MCP Server — 图片 / 视频 / 文档理解
 *
 * 模型分层：
 *   主力层  qwen3.5-omni-flash  图片描述、视频帧分析、通用视觉问答  ~0.00015 元/张
 *   文档层  qwen-vl-ocr          表格提取、OCR 文字识别、发票/合同  ~0.00008 元/张
 */

import { existsSync, statSync, createReadStream } from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------
const DASHSCOPE_BASE = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const MODEL_OMNI = "qwen3.5-omni-flash";
const MODEL_OCR = "qwen-vl-ocr";

const IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
]);
const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/avi",
  "video/mov",
  "video/mkv",
  "video/webm",
]);

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function getMimeType(filePath: string): string | null {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    bmp: "image/bmp",
    mp4: "video/mp4",
    avi: "video/avi",
    mov: "video/mov",
    mkv: "video/mkv",
    webm: "video/webm",
  };
  return mimeMap[ext ?? ""] ?? null;
}

async function encodeFileBase64(filePath: string): Promise<string> {
  const mime = getMimeType(filePath) ?? "application/octet-stream";
  const stat = statSync(filePath);

  if (IMAGE_MIMES.has(mime) && stat.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `图片文件过大: ${stat.size} bytes (上限 ${MAX_IMAGE_BYTES})`,
    );
  }
  if (VIDEO_MIMES.has(mime) && stat.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `视频文件过大: ${stat.size} bytes (上限 ${MAX_VIDEO_BYTES})`,
    );
  }

  const chunks: Buffer[] = [];
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const b64 = Buffer.concat(chunks).toString("base64");
  return `data:${mime};base64,${b64}`;
}

interface DashScopeResponse {
  choices: { message: { content: string } }[];
  usage?: { total_tokens: number };
}

async function callDashScope(
  model: string,
  messages: Record<string, unknown>[],
  apiKey: string,
  maxTokens = 4096,
): Promise<DashScopeResponse> {
  const resp = await fetch(`${DASHSCOPE_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "(无法读取响应体)");
    throw new Error(`DashScope API 错误 (${resp.status}): ${body.slice(0, 500)}`);
  }

  return resp.json() as Promise<DashScopeResponse>;
}

function buildUserMessage(
  prompt: string,
  dataUrls: string[],
): Record<string, unknown> {
  const content: Record<string, unknown>[] = [
    { type: "text", text: prompt },
  ];
  for (const url of dataUrls) {
    const mime = url.startsWith("data:") ? url.split(";")[0].replace("data:", "") : "";
    const mediaType = IMAGE_MIMES.has(mime) ? "image_url" : "video_url";
    content.push({ type: mediaType, [mediaType]: { url } });
  }
  return { role: "user", content };
}

function costNote(model: string, usage: { total_tokens?: number }): string {
  const tokens = usage.total_tokens ?? 0;
  const rate = model === MODEL_OCR ? 0.00008 : 0.00015;
  const cost = (tokens * rate) / 1000;
  return `\n\n---\n💰 预估费用: ~${tokens} tokens (约 ¥${cost.toFixed(6)})`;
}

// ---------------------------------------------------------------------------
// 工具处理器
// ---------------------------------------------------------------------------

async function imageAnalyze(
  args: Record<string, unknown>,
  apiKey: string,
): Promise<string> {
  const imagePath = args["image_path"] as string;
  const prompt =
    (args["prompt"] as string) ??
    "请全面详细地描述这张图片的内容，包括：画面中的主体对象、场景环境、颜色、构图、文字内容（如有）、以及可能传达的信息或情感。";

  if (!existsSync(imagePath)) throw new Error(`文件不存在: ${imagePath}`);

  const dataUrl = await encodeFileBase64(imagePath);
  const messages = [
    {
      role: "system",
      content:
        "你是一个专业的图片分析助手，请仔细观察图片并给出准确、详尽的描述。",
    },
    buildUserMessage(prompt, [dataUrl]),
  ];

  const result = await callDashScope(MODEL_OMNI, messages, apiKey);
  return result.choices[0].message.content + costNote(MODEL_OMNI, result.usage ?? {});
}

async function ocr(
  args: Record<string, unknown>,
  apiKey: string,
): Promise<string> {
  const imagePath = args["image_path"] as string;
  const prompt =
    (args["prompt"] as string) ??
    "请提取并输出这张图片中的所有文字内容。如有表格，请保持表格结构。按阅读顺序输出。";

  if (!existsSync(imagePath)) throw new Error(`文件不存在: ${imagePath}`);

  const dataUrl = await encodeFileBase64(imagePath);
  const messages = [
    {
      role: "system",
      content:
        "你是一个专业的 OCR 文字识别助手，请准确提取图片中的所有文字和表格。",
    },
    buildUserMessage(prompt, [dataUrl]),
  ];

  const result = await callDashScope(MODEL_OCR, messages, apiKey);
  return result.choices[0].message.content + costNote(MODEL_OCR, result.usage ?? {});
}

async function videoAnalyze(
  args: Record<string, unknown>,
  apiKey: string,
): Promise<string> {
  const videoPath = args["video_path"] as string;
  const prompt =
    (args["prompt"] as string) ??
    "请分析这个视频的内容，包括：视频中发生了什么事件或动作、出现了哪些人物或物体、场景环境、视频的整体氛围和可能传达的信息。";

  if (!existsSync(videoPath)) throw new Error(`文件不存在: ${videoPath}`);

  const dataUrl = await encodeFileBase64(videoPath);
  const messages = [
    {
      role: "system",
      content:
        "你是一个专业的视频内容分析助手，请仔细观察视频并给出准确的分析。",
    },
    buildUserMessage(prompt, [dataUrl]),
  ];

  const result = await callDashScope(MODEL_OMNI, messages, apiKey);
  return result.choices[0].message.content + costNote(MODEL_OMNI, result.usage ?? {});
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "dashscope-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "dashscope_image_analyze",
      description:
        "使用 qwen3.5-omni-flash 模型分析图片内容。支持：图片描述、场景理解、物体识别、图表解读、UI 截图分析、视觉问答。传入本地图片文件路径，返回模型对该图片的详细分析结果。",
      inputSchema: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "本地图片文件的绝对路径，支持 png/jpg/webp/gif/bmp",
          },
          prompt: {
            type: "string",
            description:
              "对图片的提问或分析指令（可选，默认进行全面描述和分析）",
          },
        },
        required: ["image_path"],
      },
    },
    {
      name: "dashscope_ocr",
      description:
        "使用 qwen-vl-ocr 模型进行 OCR 文字识别和表格提取。擅长：文档扫描件识别、发票/合同信息提取、表格结构化提取、手写体识别、证件信息提取。传入本地图片文件路径，返回识别出的文字内容。",
      inputSchema: {
        type: "object",
        properties: {
          image_path: {
            type: "string",
            description: "本地图片文件的绝对路径，支持 png/jpg/webp/gif/bmp",
          },
          prompt: {
            type: "string",
            description:
              "对 OCR 结果的额外处理指令（可选），例如 '只提取表格'、'翻译为英文'、'格式化为 Markdown 表格'",
          },
        },
        required: ["image_path"],
      },
    },
    {
      name: "dashscope_video_analyze",
      description:
        "使用 qwen3.5-omni-flash 模型分析视频内容。支持：视频内容摘要、动作识别、场景变化检测、视频问答。传入本地视频文件路径，返回对视频内容的分析结果。注意：短视频（<3分钟）效果最佳，长视频可能只采样关键帧。",
      inputSchema: {
        type: "object",
        properties: {
          video_path: {
            type: "string",
            description:
              "本地视频文件的绝对路径，支持 mp4/avi/mov/mkv/webm",
          },
          prompt: {
            type: "string",
            description:
              "对视频的提问或分析指令（可选），例如 '描述视频中发生了什么'、'视频中有哪些物体'",
          },
        },
        required: ["video_path"],
      },
    },
  ],
}));

server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest) => {
    const apiKey = process.env["DASHSCOPE_API_KEY"];
    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "❌ 未配置 DASHSCOPE_API_KEY 环境变量。请编辑 .claude/settings.json 中 mcpServers.dashscope.env.DASHSCOPE_API_KEY 的值。",
          },
        ],
      };
    }

    try {
      let text: string;
      switch (request.params.name) {
        case "dashscope_image_analyze":
          text = await imageAnalyze(
            request.params.arguments as Record<string, unknown>,
            apiKey,
          );
          break;
        case "dashscope_ocr":
          text = await ocr(
            request.params.arguments as Record<string, unknown>,
            apiKey,
          );
          break;
        case "dashscope_video_analyze":
          text = await videoAnalyze(
            request.params.arguments as Record<string, unknown>,
            apiKey,
          );
          break;
        default:
          text = `未知工具: ${request.params.name}`;
      }
      return { content: [{ type: "text", text }] };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `❌ 错误: ${msg}` }] };
    }
  },
);

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Server 启动失败:", err);
  process.exit(1);
});
