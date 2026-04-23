import { Pie, Rose } from "@ant-design/plots";
import { memo } from "react";
import type { ContentMixDatum } from "./admin-overview-charts";

export const ContentMixChart = memo(function ContentMixChart(props: { data: ContentMixDatum[] }) {
  return (
    <Pie
      angleField="value"
      autoFit
      colorField="type"
      data={props.data}
      height={280}
      innerRadius={0.62}
      label={{ text: "type", style: { fontSize: 12 } }}
      legend={{ color: { title: false, position: "bottom" } }}
    />
  );
});

export const ContentMixRoseChart = memo(function ContentMixRoseChart(props: {
  data: ContentMixDatum[];
}) {
  return (
    <Rose
      autoFit
      colorField="type"
      data={props.data}
      height={280}
      radius={0.92}
      xField="type"
      yField="value"
    />
  );
});
