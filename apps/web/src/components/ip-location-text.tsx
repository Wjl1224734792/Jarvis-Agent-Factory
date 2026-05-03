import { cn } from "@/lib/utils";

type IpLocationTextVariant = "plain" | "profile";

export function IpLocationText(props: {
  label?: string | null;
  className?: string;
  variant: IpLocationTextVariant;
}) {
  const label = props.label?.trim() || null;

  return (
    <span className={cn("text-[0.72rem] text-muted-foreground", props.className)}>
      {props.variant === "profile" ? `IP属地:${label ?? "未知"}` : (label ?? "未知")}
    </span>
  );
}
