/** MCP 工具模块共享上下文 — 避免跨模块导入可变状态 */
export interface ToolContext {
  resolveSid: (_extra: any) => string | null;
  resp: (_obj: unknown) => { content: { type: 'text'; text: string }[] };
  /** stdio 模式回退：记录最近会话 ID（仅 session_join 调用） */
  setLastSessionId: (_sid: string) => void;
}
