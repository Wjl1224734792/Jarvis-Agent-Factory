import type { ModerationMode } from "@feijia/schemas";
import { Button } from "antd";
import {
  resolveModerationModeCopy,
  resolveModerationModeLabel,
  type ModerationTraceItem
} from "../lib/moderation-tracking";

type LegacyModerationCardProps = {
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
  mode?: never;
  onModeChange?: never;
};

type TriStateModerationCardProps = {
  title: string;
  description?: string;
  mode: ModerationMode;
  autoCopy?: string;
  aiCopy?: string;
  manualCopy?: string;
  pendingCount: number;
  loading?: boolean;
  queueLabel?: string;
  traceItems?: ModerationTraceItem[];
  traceHint?: string;
  onModeChange: (mode: ModerationMode) => void;
  enabled?: boolean;
  onEnable?: never;
  onDisable?: never;
};

type AdminModerationCardProps =
  | LegacyModerationCardProps
  | TriStateModerationCardProps;

function resolveModeTone(mode: ModerationMode) {
  switch (mode) {
    case "manual":
      return "is-manual";
    case "ai":
      return "is-ai";
    case "automatic":
      return "is-automatic";
  }
}

export function AdminModerationCard(props: AdminModerationCardProps) {
  const isTriState = "mode" in props && typeof props.onModeChange === "function";
  const currentMode = isTriState ? props.mode : props.enabled ? "ai" : "manual";
  const modeCopy = resolveModerationModeCopy({
    mode: currentMode,
    enabled: "enabled" in props ? props.enabled : undefined,
    aiCopy: props.aiCopy,
    manualCopy: props.manualCopy,
    autoCopy: props.autoCopy
  });

  const actions = isTriState
    ? ([
        { mode: "manual", label: "人工审核" },
        { mode: "ai", label: "AI审核" },
        { mode: "automatic", label: "自动审核" }
      ] as const)
    : ([
        { mode: "ai", label: "AI审核" },
        { mode: "manual", label: "人工审核" }
      ] as const);

  return (
    <div className="admin-moderation-card">
      <div className="admin-moderation-card__status">
        <span className={`admin-pill ${resolveModeTone(currentMode)}`}>
          {resolveModerationModeLabel(currentMode)}
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
        {actions.map((action) => (
          <Button
            disabled={props.loading}
            key={action.mode}
            onClick={() => {
              if (isTriState) {
                props.onModeChange(action.mode);
                return;
              }

              if (action.mode === "ai") {
                props.onEnable();
                return;
              }

              props.onDisable();
            }}
            type={currentMode === action.mode ? "primary" : "default"}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
