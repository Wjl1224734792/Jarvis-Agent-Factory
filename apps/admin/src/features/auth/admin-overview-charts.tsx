import { Bar, Column, Funnel, Line, Pie } from "@ant-design/plots";

type TimeSeriesDatum = {
  label: string;
  value: number;
};

type ContentMixDatum = {
  type: string;
  value: number;
};

type ModerationDatum = {
  domain: string;
  status: string;
  value: number;
};

type FunnelDatum = {
  stage: string;
  value: number;
};

export function RegistrationTrendChart(props: { data: TimeSeriesDatum[] }) {
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
}

export function ContentMixChart(props: { data: ContentMixDatum[] }) {
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
}

export function ActivityTrendChart(props: { data: TimeSeriesDatum[] }) {
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
}

export function ModerationFunnelChart(props: { data: FunnelDatum[] }) {
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
}

export function ModerationStatusChart(props: { data: ModerationDatum[] }) {
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
}
