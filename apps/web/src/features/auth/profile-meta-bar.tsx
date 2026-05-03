import type { ReactNode } from "react";

export interface ProfileMetric {
  key: string;
  label: string;
  value: number;
}

export function ProfileMetaBar(props: {
  bio: string;
  metrics: ProfileMetric[];
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 md:px-6">
      <p className="line-clamp-2 max-w-md text-sm leading-6 text-muted-foreground">
        {props.bio}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {props.metrics.map((metric) => (
          <div className="flex items-center gap-1" key={metric.key}>
            <span className="text-muted-foreground">{metric.label}</span>
            <span className="font-semibold text-foreground">{metric.value}</span>
          </div>
        ))}
      </div>

      {props.children ? (
        <div className="flex flex-wrap gap-2">{props.children}</div>
      ) : null}
    </div>
  );
}
