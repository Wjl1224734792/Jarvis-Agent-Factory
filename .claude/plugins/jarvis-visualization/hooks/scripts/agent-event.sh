#!/usr/bin/env bash
# ============================================================
# Jarvis Agent 事件上报脚本 — Linux / macOS
# 由 Claude Code hooks 系统在 SubagentStart / SubagentEnd 时调用
# 通过 HTTP POST 将 Agent 生命周期事件写入引擎数据库
# ============================================================
set -euo pipefail

API_URL="http://localhost:3456/api/agent-event"

# ---- 读取 hook 上下文环境变量（尝试多种常见命名）----
AGENT_ID="${CLAUDE_SUBAGENT_NAME:-${CLAUDE_AGENT_NAME:-${CLAUDE_SUBAGENT_ID:-unknown}}}"
SESSION_ID="${CLAUDE_SESSION_ID:-${CLAUDE_PROJECT_SESSION_ID:-}}"
RUN_ID="${CLAUDE_RUN_ID:-}"
EVENT_TYPE="${HOOK_EVENT_TYPE:-start}"
MODEL="${CLAUDE_MODEL:-}"
STATUS="${CLAUDE_SUBAGENT_STATUS:-}"

# 错误信息（仅 SubagentEnd 异常时有值）
ERROR_MSG="${CLAUDE_ERROR_MESSAGE:-}"

# ---- Token 数据（SubagentEnd / error 时引擎会写入）----
INPUT_TOKENS="${CLAUDE_TOKEN_INPUT:-${CLAUDE_INPUT_TOKENS:-0}}"
OUTPUT_TOKENS="${CLAUDE_TOKEN_OUTPUT:-${CLAUDE_OUTPUT_TOKENS:-0}}"
CACHE_CREATE_TOKENS="${CLAUDE_CACHE_CREATION_INPUT_TOKENS:-0}"
CACHE_READ_TOKENS="${CLAUDE_CACHE_READ_INPUT_TOKENS:-0}"

# ---- 构造 JSON 请求体 ----
# 优先使用 jq 做安全转义；不可用时退化为手动构造
if command -v jq &>/dev/null; then
  JSON_BODY=$(jq -n \
    --arg event         "$EVENT_TYPE" \
    --arg agent_id      "$AGENT_ID" \
    --arg run_id        "$RUN_ID" \
    --arg session_id    "$SESSION_ID" \
    --arg model         "$MODEL" \
    --arg status        "$STATUS" \
    --arg error_message "$ERROR_MSG" \
    --argjson input_tokens                "$INPUT_TOKENS" \
    --argjson output_tokens               "$OUTPUT_TOKENS" \
    --argjson cache_creation_input_tokens "$CACHE_CREATE_TOKENS" \
    --argjson cache_read_input_tokens     "$CACHE_READ_TOKENS" \
    '{
      event: $event,
      agent_id: $agent_id,
      run_id: $run_id,
      session_id: $session_id,
      model: $model,
      status: $status,
      error_message: $error_message,
      input_tokens: $input_tokens,
      output_tokens: $output_tokens,
      cache_creation_input_tokens: $cache_creation_input_tokens,
      cache_read_input_tokens: $cache_read_input_tokens
    }')
else
  # 手动构造 JSON（处理空字段，数值不引号）
  JSON_BODY="{\"event\":\"${EVENT_TYPE}\",\"agent_id\":\"${AGENT_ID}\",\"run_id\":\"${RUN_ID}\",\"session_id\":\"${SESSION_ID}\",\"model\":\"${MODEL}\",\"status\":\"${STATUS}\",\"error_message\":\"${ERROR_MSG}\",\"input_tokens\":${INPUT_TOKENS},\"output_tokens\":${OUTPUT_TOKENS},\"cache_creation_input_tokens\":${CACHE_CREATE_TOKENS},\"cache_read_input_tokens\":${CACHE_READ_TOKENS}}"
fi

# ---- 发送 POST 请求 ----
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "${JSON_BODY}" 2>&1) || true

HTTP_CODE=$(echo "${RESPONSE}" | tail -n 1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [ "${HTTP_CODE}" -ge 200 ] 2>/dev/null && [ "${HTTP_CODE}" -lt 300 ] 2>/dev/null; then
  exit 0
else
  echo "[agent-event.sh] API 请求失败 (HTTP ${HTTP_CODE}): ${BODY}" >&2
  exit 1
fi
