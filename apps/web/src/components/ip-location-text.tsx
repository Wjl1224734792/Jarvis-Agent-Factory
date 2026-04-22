import { cn } from "@/lib/utils";

export function IpLocationText(props: {
  label?: string | null;
  className?: string;
  prefix?: string;
}) {
  if (!props.label) {
    return null;
  }

  return (
    <span className={cn("text-[0.72rem] text-muted-foreground", props.className)}>
      {(props.prefix ?? "IP属地")}：{props.label}
    </span>
  );
}
