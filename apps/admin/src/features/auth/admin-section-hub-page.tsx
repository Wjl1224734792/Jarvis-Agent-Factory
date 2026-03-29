import { ArrowRightOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdminPage, AdminPanel } from "../../components/admin-ui";

type HubItem = {
  title: string;
  description: string;
  to: string;
  icon?: ReactNode;
};

export function AdminSectionHubPage(props: {
  title: string;
  description: string;
  items: HubItem[];
}) {
  return (
    <AdminPage description={props.description} title={props.title}>
      <AdminPanel description="按职责聚合的快捷入口，方便快速切换到对应工作流。" title="分区入口">
        <div className="admin-section-grid">
          {props.items.map((item) => (
            <Link className="admin-section-card" key={item.to} to={item.to}>
              <div className="admin-section-card__icon">{item.icon ?? <ArrowRightOutlined />}</div>
              <div className="admin-section-card__title">{item.title}</div>
              <div className="admin-section-card__description">{item.description}</div>
              <Button className="admin-section-card__cta" type="link">
                打开入口
              </Button>
            </Link>
          ))}
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
