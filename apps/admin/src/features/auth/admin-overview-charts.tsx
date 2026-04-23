export type TimeSeriesDatum = {
  label: string;
  value: number;
};

export type ContentMixDatum = {
  type: string;
  value: number;
};

export type ModerationDatum = {
  domain: string;
  status: string;
  value: number;
};

export type FunnelDatum = {
  stage: string;
  value: number;
};

export type ModerationRadarDatum = {
  domain: string;
  metric: string;
  value: number;
};
