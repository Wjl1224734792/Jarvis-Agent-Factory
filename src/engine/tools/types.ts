/** MCP 工具模块共享上下文 — 避免跨模块导入可变状态 */
export interface ToolContext {
  resolveSid: (_extra: any) => string | null;
  resp: (_obj: unknown) => { content: { type: 'text'; text: string }[] };
  /** stdio 模式回退：记录最近会话 ID（仅 session_join 调用）。HTTP 模式应从 extra.sessionId 获取，此方法为 no-op。 */
  setLastSessionId: (_sid: string) => void;
  /** 是否为 stdio 传输模式（单连接，无 transport 层 sessionId） */
  isStdio: boolean;
}
