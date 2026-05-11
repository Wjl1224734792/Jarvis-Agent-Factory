<#
.SYNOPSIS
  Jarvis Agent 事件上报脚本 — Windows PowerShell (5.1+ 兼容)
  由 Claude Code hooks 在 SubagentStart / SubagentEnd 时调用
  数据来源：stdin JSON（Claude Code hook 标准协议）
#>
$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3456/api/agent-event"

# ---- 1. 优先从 stdin 读取 JSON（Claude Code 标准方式）----
$stdinJson = $null
try {
  if (-not [Console]::IsInputRedirected) { $stdinJson = $null }
  else {
    $raw = [Console]::In.ReadToEnd()
    if ($raw) { $stdinJson = $raw | ConvertFrom-Json }
  }
} catch { $stdinJson = $null }

# ---- 2. 解析 stdin JSON，回退到环境变量 ----
if ($stdinJson) {
  $AGENT_ID    = if ($stdinJson.subagent_name) { $stdinJson.subagent_name }
            elseif ($stdinJson.agent_name)    { $stdinJson.agent_name }
            elseif ($stdinJson.agent_id)      { $stdinJson.agent_id }
            elseif ($stdinJson.name)          { $stdinJson.name }
            else                              { "unknown" }
  $EVENT_TYPE  = if ($stdinJson.event) { $stdinJson.event } else { $env:HOOK_EVENT_TYPE }
  $SESSION_ID  = if ($stdinJson.session_id) { $stdinJson.session_id } else { "" }
  $RUN_ID      = if ($stdinJson.run_id) { $stdinJson.run_id } else { "" }
  $MODEL       = if ($stdinJson.model) { $stdinJson.model } else { "" }
  $STATUS      = if ($stdinJson.status) { $stdinJson.status } else { "" }
  $ERROR_MSG   = if ($stdinJson.error_message) { $stdinJson.error_message }
            elseif ($stdinJson.error) { $stdinJson.error }
            else { "" }
  $INPUT_TOKENS          = [int]($stdinJson.input_tokens -as [int])
  $OUTPUT_TOKENS         = [int]($stdinJson.output_tokens -as [int])
  $CACHE_CREATE_TOKENS   = [int]($stdinJson.cache_creation_input_tokens -as [int])
  $CACHE_READ_TOKENS     = [int]($stdinJson.cache_read_input_tokens -as [int])
} else {
  # 回退到环境变量（兼容旧版本 Claude Code）
  $AGENT_ID = if ($env:CLAUDE_SUBAGENT_NAME)    { $env:CLAUDE_SUBAGENT_NAME }
         elseif ($env:CLAUDE_AGENT_NAME)         { $env:CLAUDE_AGENT_NAME }
         elseif ($env:CLAUDE_SUBAGENT_ID)        { $env:CLAUDE_SUBAGENT_ID }
         else                                    { "unknown" }
  $EVENT_TYPE = if ($env:HOOK_EVENT_TYPE) { $env:HOOK_EVENT_TYPE } else { "start" }
  $SESSION_ID = if ($env:CLAUDE_SESSION_ID)      { $env:CLAUDE_SESSION_ID }
           elseif ($env:CLAUDE_PROJECT_SESSION_ID) { $env:CLAUDE_PROJECT_SESSION_ID }
           else                                  { "" }
  $RUN_ID   = if ($env:CLAUDE_RUN_ID) { $env:CLAUDE_RUN_ID } else { "" }
  $MODEL    = if ($env:CLAUDE_MODEL)  { $env:CLAUDE_MODEL }  else { "" }
  $STATUS   = if ($env:CLAUDE_SUBAGENT_STATUS) { $env:CLAUDE_SUBAGENT_STATUS } else { "" }
  $ERROR_MSG = if ($env:CLAUDE_ERROR_MESSAGE) { $env:CLAUDE_ERROR_MESSAGE } else { "" }

  $tokenInput  = if ($env:CLAUDE_TOKEN_INPUT)  { $env:CLAUDE_TOKEN_INPUT }
            elseif ($env:CLAUDE_INPUT_TOKENS)    { $env:CLAUDE_INPUT_TOKENS }
            else                                 { "0" }
  $tokenOutput = if ($env:CLAUDE_TOKEN_OUTPUT)  { $env:CLAUDE_TOKEN_OUTPUT }
            elseif ($env:CLAUDE_OUTPUT_TOKENS)    { $env:CLAUDE_OUTPUT_TOKENS }
            else                                  { "0" }
  $cacheCreate = if ($env:CLAUDE_CACHE_CREATION_INPUT_TOKENS) { $env:CLAUDE_CACHE_CREATION_INPUT_TOKENS } else { "0" }
  $cacheRead   = if ($env:CLAUDE_CACHE_READ_INPUT_TOKENS)     { $env:CLAUDE_CACHE_READ_INPUT_TOKENS }     else { "0" }
  $INPUT_TOKENS          = [int]$tokenInput
  $OUTPUT_TOKENS         = [int]$tokenOutput
  $CACHE_CREATE_TOKENS   = [int]$cacheCreate
  $CACHE_READ_TOKENS     = [int]$cacheRead
}

# 回退 event type
if (-not $EVENT_TYPE) { $EVENT_TYPE = if ($env:HOOK_EVENT_TYPE) { $env:HOOK_EVENT_TYPE } else { "start" } }

# ---- 3. 构造 JSON 请求体 ----
$Body = @{
  event                       = $EVENT_TYPE
  agent_id                    = $AGENT_ID
  run_id                      = $RUN_ID
  session_id                  = $SESSION_ID
  model                       = $MODEL
  status                      = $STATUS
  error_message               = $ERROR_MSG
  input_tokens                = $INPUT_TOKENS
  output_tokens               = $OUTPUT_TOKENS
  cache_creation_input_tokens = $CACHE_CREATE_TOKENS
  cache_read_input_tokens     = $CACHE_READ_TOKENS
} | ConvertTo-Json -Compress

# ---- 4. 发送 POST 请求 ----
try {
  $Response = Invoke-RestMethod -Uri $API_URL -Method Post `
    -ContentType "application/json" -Body $Body -SkipHttpErrorCheck

  if ($Response.ok) {
    exit 0
  } else {
    Write-Error "[agent-event.ps1] API 返回失败: $($Response | ConvertTo-Json -Compress)"
    exit 1
  }
} catch {
  Write-Error "[agent-event.ps1] 请求异常: $_"
  exit 1
}
