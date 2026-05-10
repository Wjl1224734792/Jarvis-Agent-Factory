<#
.SYNOPSIS
  Jarvis Agent 事件上报脚本 — Windows PowerShell (5.1+ 兼容)
  由 Claude Code hooks 系统在 SubagentStart / SubagentEnd 时调用
  通过 Invoke-RestMethod 将 Agent 生命周期事件写入引擎数据库
#>

$ErrorActionPreference = "Stop"
$API_URL = "http://localhost:3456/api/agent-event"

# ---- 读取 hook 上下文环境变量（尝试多种常见命名）----
$AGENT_ID = if ($env:CLAUDE_SUBAGENT_NAME)    { $env:CLAUDE_SUBAGENT_NAME }
       elseif ($env:CLAUDE_AGENT_NAME)         { $env:CLAUDE_AGENT_NAME }
       elseif ($env:CLAUDE_SUBAGENT_ID)        { $env:CLAUDE_SUBAGENT_ID }
       else                                    { "unknown" }

$SESSION_ID = if ($env:CLAUDE_SESSION_ID)      { $env:CLAUDE_SESSION_ID }
         elseif ($env:CLAUDE_PROJECT_SESSION_ID) { $env:CLAUDE_PROJECT_SESSION_ID }
         else                                  { "" }

$RUN_ID = if ($env:CLAUDE_RUN_ID) { $env:CLAUDE_RUN_ID } else { "" }
$MODEL  = if ($env:CLAUDE_MODEL)  { $env:CLAUDE_MODEL }  else { "" }
$STATUS = if ($env:CLAUDE_SUBAGENT_STATUS) { $env:CLAUDE_SUBAGENT_STATUS } else { "" }

# ---- Hook 事件类型（由 hooks.json env 注入）----
$EVENT_TYPE = if ($env:HOOK_EVENT_TYPE) { $env:HOOK_EVENT_TYPE } else { "start" }

# ---- 错误信息（SubagentEnd 异常时有值）----
$ERROR_MSG = if ($env:CLAUDE_ERROR_MESSAGE) { $env:CLAUDE_ERROR_MESSAGE } else { "" }

# ---- Token 数据（SubagentEnd / error 时引擎会写入）----
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

# ---- 构造 JSON 请求体 ----
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
} | ConvertTo-Json

# ---- 发送 POST 请求 ----
try {
  $Response = Invoke-RestMethod -Uri $API_URL -Method Post `
    -ContentType "application/json" -Body $Body -SkipHttpErrorCheck

  if ($Response.ok) {
    exit 0
  } else {
    Write-Error "[agent-event.ps1] API 返回失败: $($Response | ConvertTo-Json)"
    exit 1
  }
} catch {
  Write-Error "[agent-event.ps1] 请求异常: $_"
  exit 1
}
