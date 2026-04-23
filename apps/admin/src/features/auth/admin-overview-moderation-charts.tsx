import { Bar, Funnel, Radar } from "@ant-design/plots";
import { memo } from "react";
import type { FunnelDatum, ModerationDatum, ModerationRadarDatum } from "./admin-overview-charts";

export const ModerationFunnelChart = memo(function ModerationFunnelChart(props: {
  data: FunnelDatum[];
}) {
  return (
    <Funnel
      autoFit
      colorField="stage"
      data={props.data}
      height={280}
      xField="stage"
      yField="value"
    />
  );
});

export const ModerationStatusChart = memo(function ModerationStatusChart(props: {
  data: ModerationDatum[];
}) {
  return (
    <Bar
      autoFit
      data={props.data}
      height={320}
      isStack
      legend={{ color: { position: "bottom" } }}
      seriesField="status"
      xField="value"
      yField="domain"
    />
  );
});

export const ModerationDomainRadarChart = memo(function ModerationDomainRadarChart(props: {
  data: ModerationRadarDatum[];
}) {
  return (
    <Radar
      autoFit
      area={{ style: { fillOpacity: 0.12 } }}
      data={props.data}
      height={320}
      seriesField="metric"
      xField="domain"
      yAxis={{ nice: true }}
      yField="value"
    />
  );
});
