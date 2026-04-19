import type { ReactNode } from "react";
import { Flex, Space } from "antd";

export function AdminPage(props: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="admin-page">
      <Flex align="flex-start" className="admin-page__header" gap={16} justify="space-between" wrap>
        <div className="admin-page__title-group">
          <div className="admin-page__title">{props.title}</div>
        </div>
        {props.actions ? <Space size="middle" wrap>{props.actions}</Space> : null}
      </Flex>
      {props.children}
    </section>
  );
}

export function AdminPanel(props: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  tight?: boolean;
}) {
  return (
    <section className={`admin-panel${props.tight ? " admin-panel--tight" : ""}`}>
      {props.title || props.description || props.actions ? (
        <Flex align="flex-start" className="admin-panel__header" gap={16} justify="space-between" wrap>
          <div>
            {props.title ? <div className="admin-panel__title">{props.title}</div> : null}
          </div>
          {props.actions ? <Space size="small" wrap>{props.actions}</Space> : null}
        </Flex>
      ) : null}
      {props.children}
    </section>
  );
}

export function AdminMetric(props: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
      <div className="admin-metric">
        <div className="admin-metric__label">{props.label}</div>
        <div className="admin-metric__value">{props.value}</div>
      </div>
  );
}
