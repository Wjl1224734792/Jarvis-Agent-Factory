import { Button } from "antd";

export function AdminModerationCard(props: {
  title: string;
  description: string;
  enabled: boolean;
  autoCopy: string;
  manualCopy: string;
  pendingCount: number;
  loading?: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="admin-moderation-card">
      <div className="admin-moderation-card__status">
        <span className={`admin-pill ${props.enabled ? "is-on" : "is-off"}`}>
          {props.enabled ? "人工审核" : "自动审核"}
        </span>
        <div>
          <div className="admin-moderation-card__title">{props.title}</div>
          <div className="admin-moderation-card__description">{props.description}</div>
        </div>
        <div className="admin-moderation-card__copy">
          {props.enabled ? props.manualCopy : props.autoCopy}
        </div>
        <div className="admin-moderation-card__meta">当前待处理 {props.pendingCount}</div>
      </div>
      <div className="admin-moderation-card__actions">
        <Button
          disabled={props.loading}
          onClick={props.onEnable}
          type={props.enabled ? "primary" : "default"}
        >
          人工审核
        </Button>
        <Button
          disabled={props.loading}
          onClick={props.onDisable}
          type={!props.enabled ? "primary" : "default"}
        >
          自动审核
        </Button>
      </div>
    </div>
  );
}
