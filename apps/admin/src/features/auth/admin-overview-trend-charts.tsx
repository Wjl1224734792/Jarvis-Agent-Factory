import { Column, Line } from "@ant-design/plots";
import { memo } from "react";
import type { TimeSeriesDatum } from "./admin-overview-charts";

export const RegistrationTrendChart = memo(function RegistrationTrendChart(props: {
  data: TimeSeriesDatum[];
}) {
  return (
    <Column
      autoFit
      color="#1f78ff"
      data={props.data}
      height={280}
      xAxis={{ labelAutoRotate: false }}
      xField="label"
      yAxis={{ nice: true }}
      yField="value"
    />
  );
});

export const ActivityTrendChart = memo(function ActivityTrendChart(props: { data: TimeSeriesDatum[] }) {
  return (
    <Line
      autoFit
      color="#14b8a6"
      data={props.data}
      height={280}
      point={{ size: 3 }}
      smooth
      xField="label"
      yAxis={{ nice: true }}
      yField="value"
    />
  );
});
