import * as qiniu from "qiniu";
import { auditsRepo } from "./audits.repo";

type QiniuSuggestion = "pass" | "review" | "block";
type AuditRecordStatus =
  | "queued"
  | "running"
  | "passed"
  | "rejected"
  | "needs_manual_review"
  | "failed"
  | "manual_passed"
  | "manual_rejected";

type TextAuditScene = "antispam";
type MediaAuditScene = "pulp" | "terror" | "politician" | "ads" | "behavior";

function resolveAuditMac() {
  const accessKey =
    process.env.QINIU_AUDIT_ACCESS_KEY_ID?.trim() || process.env.STORAGE_ACCESS_KEY_ID?.trim();
  const secretKey =
    process.env.QINIU_AUDIT_SECRET_ACCESS_KEY?.trim() || process.env.STORAGE_SECRET_ACCESS_KEY?.trim();

  if (!accessKey || !secretKey) {
    throw new Error("Missing Qiniu audit credentials.");
  }

  return new qiniu.auth.digest.Mac(accessKey, secretKey);
}

function buildAuthHeader(url: string, body: string) {
  return qiniu.util.generateAccessTokenV2(
    resolveAuditMac(),
    url,
    "POST",
    "application/json",
    body
  );
}

function normalizeSuggestion(suggestion: string | null | undefined): AuditRecordStatus {
  if (suggestion === "pass") {
    return "passed";
  }
  if (suggestion === "block") {
    return "rejected";
  }
  if (suggestion === "review") {
    return "needs_manual_review";
  }
  return "failed";
}

function resolveTestSuggestion(): QiniuSuggestion {
  const value = process.env.QINIU_AUDIT_TEST_SUGGESTION?.trim().toLowerCase();
  if (value === "pass" || value === "review" || value === "block") {
    return value;
  }

  return "pass";
}

function extractSceneSuggestions(
  scenes: Record<string, { suggestion?: string } | undefined> | undefined
) {
  if (!scenes) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(scenes)
      .filter(([, value]) => Boolean(value?.suggestion))
      .map(([key, value]) => [key, value?.suggestion ?? "unknown"])
  );
}

function extractDetailLabels(
  scenes: Record<string, { details?: Array<{ label?: string }> } | undefined> | undefined
) {
  if (!scenes) {
    return [];
  }

  return Object.values(scenes)
    .flatMap((scene) => scene?.details ?? [])
    .map((detail) => detail.label)
    .filter((label): label is string => Boolean(label));
}

async function postAuditRequest(url: string, body: Record<string, unknown>) {
  const serializedBody = JSON.stringify(body);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(url, serializedBody),
      "Content-Type": "application/json"
    },
    body: serializedBody,
    signal: AbortSignal.timeout(10_000)
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    throw new Error(`Qiniu audit request failed with status ${response.status}.`);
  }

  return {
    requestId: response.headers.get("x-log"),
    payload
  };
}

export const qiniuAuditService = {
  async reviewText(input: {
    domain: string;
    entityId: string;
    text: string;
    scene?: TextAuditScene;
    mode?: "ai" | "automatic";
  }) {
    const scene = input.scene ?? "antispam";
    const mode = input.mode ?? "ai";
    const request = await auditsRepo.create({
      domain: input.domain,
      entityId: input.entityId,
      contentType: "text",
      mode,
      status: "running",
      scene
    });

    if (!request) {
      throw new Error("Failed to create audit record.");
    }

    if (process.env.NODE_ENV === "test") {
      const suggestion = resolveTestSuggestion();
      return auditsRepo.update(request.id, {
        status: normalizeSuggestion(suggestion),
        suggestion,
        scene,
        sceneSuggestions: { [scene]: suggestion },
        rawPayload: { mock: true, suggestion },
        resolvedAt: new Date()
      });
    }

    try {
      const url = process.env.QINIU_TEXT_AUDIT_URL?.trim() || "https://ai.qiniuapi.com/v3/text/censor";
      const { requestId, payload } = await postAuditRequest(url, {
        data: {
          text: input.text
        },
        params: {
          scenes: [scene]
        }
      });

      const result = (payload.result ?? {}) as Record<string, unknown>;
      const scenes = (result.scenes ?? {}) as Record<string, { suggestion?: string; details?: Array<{ label?: string }> }>;
      const suggestion =
        typeof result.suggestion === "string"
          ? result.suggestion
          : typeof scenes[scene]?.suggestion === "string"
            ? scenes[scene]?.suggestion
            : null;

      return auditsRepo.update(request.id, {
        status: normalizeSuggestion(suggestion),
        suggestion,
        requestId,
        scene,
        detailLabels: extractDetailLabels(scenes),
        sceneSuggestions: extractSceneSuggestions(scenes),
        rawPayload: payload,
        resolvedAt: new Date()
      });
    } catch (error) {
      return auditsRepo.update(request.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        resolvedAt: new Date()
      });
    }
  },
  async reviewImage(input: {
    domain: string;
    entityId: string;
    imageUrl: string;
    scenes?: MediaAuditScene[];
  }) {
    const scenes = input.scenes ?? ["pulp", "terror", "politician", "ads", "behavior"];
    const request = await auditsRepo.create({
      domain: input.domain,
      entityId: input.entityId,
      contentType: "image",
      mode: "ai",
      status: "running",
      scene: scenes.join(",")
    });

    if (!request) {
      throw new Error("Failed to create audit record.");
    }

    if (process.env.NODE_ENV === "test") {
      const suggestion = resolveTestSuggestion();
      return auditsRepo.update(request.id, {
        status: normalizeSuggestion(suggestion),
        suggestion,
        scene: scenes.join(","),
        sceneSuggestions: Object.fromEntries(scenes.map((scene) => [scene, suggestion])),
        rawPayload: { mock: true, suggestion },
        resolvedAt: new Date()
      });
    }

    try {
      const url = process.env.QINIU_IMAGE_AUDIT_URL?.trim() || "https://ai.qiniuapi.com/v3/image/censor";
      const { requestId, payload } = await postAuditRequest(url, {
        data: {
          uri: input.imageUrl
        },
        params: {
          scenes
        }
      });

      const result = (payload.result ?? {}) as Record<string, unknown>;
      const sceneMap = (result.scenes ?? {}) as Record<string, { suggestion?: string; details?: Array<{ label?: string }> }>;
      const suggestion = typeof result.suggestion === "string" ? result.suggestion : null;

      return auditsRepo.update(request.id, {
        status: normalizeSuggestion(suggestion),
        suggestion,
        requestId,
        scene: scenes.join(","),
        detailLabels: extractDetailLabels(sceneMap),
        sceneSuggestions: extractSceneSuggestions(sceneMap),
        rawPayload: payload,
        resolvedAt: new Date()
      });
    } catch (error) {
      return auditsRepo.update(request.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        resolvedAt: new Date()
      });
    }
  },
  async submitVideoReview(input: {
    domain: string;
    entityId: string;
    videoUrl: string;
    callbackUrl: string;
    scenes?: MediaAuditScene[];
  }) {
    const scenes = input.scenes ?? ["pulp", "terror", "politician", "ads", "behavior"];
    const request = await auditsRepo.create({
      domain: input.domain,
      entityId: input.entityId,
      contentType: "video",
      mode: "ai",
      status: "running",
      scene: scenes.join(",")
    });

    if (!request) {
      throw new Error("Failed to create audit record.");
    }

    if (process.env.NODE_ENV === "test") {
      return auditsRepo.update(request.id, {
        status: "running",
        taskId: `mock-task-${request.id}`,
        scene: scenes.join(","),
        rawPayload: { mock: true, suggestion: resolveTestSuggestion() }
      });
    }

    try {
      const url = process.env.QINIU_VIDEO_AUDIT_URL?.trim() || "https://ai.qiniuapi.com/v3/video/censor";
      const { requestId, payload } = await postAuditRequest(url, {
        data: {
          uri: input.videoUrl
        },
        params: {
          scenes,
          hook_url: input.callbackUrl,
          hook_auth: true
        }
      });

      const taskId =
        typeof payload.id === "string"
          ? payload.id
          : typeof payload.job === "string"
            ? payload.job
            : null;

      return auditsRepo.update(request.id, {
        status: "running",
        requestId,
        taskId,
        scene: scenes.join(","),
        rawPayload: payload
      });
    } catch (error) {
      return auditsRepo.update(request.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
        resolvedAt: new Date()
      });
    }
  },
  verifyCallback(input: {
    requestUrl: string;
    requestBody: string;
    callbackAuth: string;
    method: string;
    contentType: string | undefined;
    headers: Record<string, string>;
  }) {
    return qiniu.util.isQiniuCallback(
      resolveAuditMac(),
      input.requestUrl,
      input.requestBody,
      input.callbackAuth,
      {
        reqMethod: input.method,
        reqContentType: input.contentType,
        reqHeaders: input.headers
      }
    );
  },
  async handleVideoCallback(payload: Record<string, unknown>) {
    const taskId = typeof payload.id === "string" ? payload.id : null;
    if (!taskId) {
      return null;
    }

    const existing = await auditsRepo.getByTaskId(taskId);
    if (!existing) {
      return null;
    }

    const result = (payload.result ?? {}) as Record<string, unknown>;
    const scenes = (result.scenes ?? {}) as Record<string, { suggestion?: string; details?: Array<{ label?: string }> }>;
    const suggestion = typeof result.suggestion === "string" ? result.suggestion : null;

    return auditsRepo.update(existing.id, {
      status: normalizeSuggestion(suggestion),
      suggestion,
      detailLabels: extractDetailLabels(scenes),
      sceneSuggestions: extractSceneSuggestions(scenes),
      rawPayload: payload,
      callbackReceivedAt: new Date(),
      resolvedAt: new Date()
    });
  }
};
