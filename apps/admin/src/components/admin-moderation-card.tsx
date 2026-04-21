import { Button } from "antd";
import {
  resolveModerationModeCopy,
  type ModerationTraceItem
} from "../lib/moderation-tracking";

export function AdminModerationCard(props: {
  title: string;
  description?: string;
  enabled: boolean;
  autoCopy?: string;
  aiCopy?: string;
  manualCopy?: string;
  pendingCount: number;
  loading?: boolean;
  queueLabel?: string;
  traceItems?: ModerationTraceItem[];
  traceHint?: string;
  onEnable: () => void;
  onDisable: () => void;
}) {
  const modeCopy = resolveModerationModeCopy({
    enabled: props.enabled,
    aiCopy: props.aiCopy,
    manualCopy: props.manualCopy,
    autoCopy: props.autoCopy
  });

  return (
    <div className="admin-moderation-card">
      <div className="admin-moderation-card__status">
        <span className={`admin-pill ${props.enabled ? "is-on" : "is-off"}`}>
          {props.enabled ? "AI审核" : "人工审核"}
        </span>
        <div className="admin-moderation-card__title">{props.title}</div>
        <div className="admin-moderation-card__meta">
          {props.queueLabel ?? "当前待处理"} {props.pendingCount}
        </div>
      </div>
      <div className="admin-moderation-card__body">
        {props.description ? (
          <div className="admin-moderation-card__description">{props.description}</div>
        ) : null}
        <div className="admin-moderation-card__copy">{modeCopy}</div>
        {props.traceItems?.length ? (
          <div className="admin-moderation-card__trace">
            <div className="admin-moderation-card__meta">审核追踪</div>
            <div className="admin-moderation-card__trace-list">
              {props.traceItems.map((item) => (
                <div className="admin-moderation-card__trace-item" key={`${item.label}-${item.value}`}>
                  <span className="admin-moderation-card__trace-label">{item.label}</span>
                  <span
                    className={`admin-moderation-card__trace-value${
                      item.tone ? ` is-${item.tone}` : ""
                    }`}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {props.traceHint ? (
          <div className="admin-moderation-card__hint">{props.traceHint}</div>
        ) : null}
      </div>
      <div className="admin-moderation-card__actions">
        <Button disabled={props.loading} onClick={props.onEnable} type={props.enabled ? "primary" : "default"}>
          AI审核
        </Button>
        <Button disabled={props.loading} onClick={props.onDisable} type={!props.enabled ? "primary" : "default"}>
          人工审核
        </Button>
      </div>
    </div>
  );
}
