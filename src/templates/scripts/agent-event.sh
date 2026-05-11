#!/usr/bin/env bash
# ============================================================
# Jarvis Agent 事件上报脚本 — Linux / macOS
# 由 Claude Code hooks 在 SubagentStart / SubagentEnd 时调用
# 数据来源：stdin JSON（Claude Code hook 标准协议）
# ============================================================
set -euo pipefail

API_URL="http://localhost:3456/api/agent-event"

# ---- 1. 优先从 stdin 读取 JSON（Claude Code 标准方式）----
STDIN_JSON=""
if [ ! -t 0 ]; then
  STDIN_JSON=$(cat 2>/dev/null || echo "")
fi

# ---- 2. 解析 stdin JSON，同时回退到环境变量 ----
if [ -n "${STDIN_JSON:-}" ] && command -v jq &>/dev/null; then
  # 从 stdin JSON 提取所有字段
  AGENT_ID=$(echo "$STDIN_JSON" | jq -r '.subagent_name // .agent_name // .agent_id // .name // ""')
  EVENT_TYPE=$(echo "$STDIN_JSON" | jq -r '.event // ""')
  SESSION_ID=$(echo "$STDIN_JSON" | jq -r '.session_id // ""')
  RUN_ID=$(echo "$STDIN_JSON" | jq -r '.run_id // ""')
  MODEL=$(echo "$STDIN_JSON" | jq -r '.model // ""')
  STATUS=$(echo "$STDIN_JSON" | jq -r '.status // ""')
  ERROR_MSG=$(echo "$STDIN_JSON" | jq -r '.error_message // .error // ""')
  INPUT_TOKENS=$(echo "$STDIN_JSON" | jq -r '.input_tokens // .total_input_tokens // 0')
  OUTPUT_TOKENS=$(echo "$STDIN_JSON" | jq -r '.output_tokens // .total_output_tokens // 0')
  CACHE_CREATE_TOKENS=$(echo "$STDIN_JSON" | jq -r '.cache_creation_input_tokens // 0')
  CACHE_READ_TOKENS=$(echo "$STDIN_JSON" | jq -r '.cache_read_input_tokens // 0')
else
  # 回退到环境变量（兼容旧版本 Claude Code）
  AGENT_ID="${CLAUDE_SUBAGENT_NAME:-${CLAUDE_AGENT_NAME:-${CLAUDE_SUBAGENT_ID:-unknown}}}"
  EVENT_TYPE="${HOOK_EVENT_TYPE:-start}"
  SESSION_ID="${CLAUDE_SESSION_ID:-${CLAUDE_PROJECT_SESSION_ID:-}}"
  RUN_ID="${CLAUDE_RUN_ID:-}"
  MODEL="${CLAUDE_MODEL:-}"
  STATUS="${CLAUDE_SUBAGENT_STATUS:-}"
  ERROR_MSG="${CLAUDE_ERROR_MESSAGE:-}"
  INPUT_TOKENS="${CLAUDE_TOKEN_INPUT:-${CLAUDE_INPUT_TOKENS:-0}}"
  OUTPUT_TOKENS="${CLAUDE_TOKEN_OUTPUT:-${CLAUDE_OUTPUT_TOKENS:-0}}"
  CACHE_CREATE_TOKENS="${CLAUDE_CACHE_CREATION_INPUT_TOKENS:-0}"
  CACHE_READ_TOKENS="${CLAUDE_CACHE_READ_INPUT_TOKENS:-0}"
fi

# 回退：如果 stdin 和 env 都没拿到 event_type，用 hooks.json 注入的值
if [ -z "${EVENT_TYPE:-}" ]; then
  EVENT_TYPE="${HOOK_EVENT_TYPE:-start}"
fi

# ---- 3. 构造 JSON 请求体 ----
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
  JSON_BODY="{\"event\":\"${EVENT_TYPE}\",\"agent_id\":\"${AGENT_ID}\",\"run_id\":\"${RUN_ID}\",\"session_id\":\"${SESSION_ID}\",\"model\":\"${MODEL}\",\"status\":\"${STATUS}\",\"error_message\":\"${ERROR_MSG}\",\"input_tokens\":${INPUT_TOKENS},\"output_tokens\":${OUTPUT_TOKENS},\"cache_creation_input_tokens\":${CACHE_CREATE_TOKENS},\"cache_read_input_tokens\":${CACHE_READ_TOKENS}}"
fi

# ---- 4. 发送 POST 请求 ----
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}" \
  -H "Content-Type: application/json" \
  -d "${JSON_BODY}" 2>&1) || true

HTTP_CODE=$(echo "${RESPONSE}" | tail -n 1)

if [ "${HTTP_CODE}" -ge 200 ] 2>/dev/null && [ "${HTTP_CODE}" -lt 300 ] 2>/dev/null; then
  exit 0
else
  BODY=$(echo "${RESPONSE}" | sed '$d')
  echo "[agent-event.sh] API 请求失败 (HTTP ${HTTP_CODE}): ${BODY}" >&2
  exit 1
fi
