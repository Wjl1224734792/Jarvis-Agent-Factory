import { cn } from "@/lib/utils";

type IpLocationTextVariant = "plain" | "profile";

export function IpLocationText(props: {
  label?: string | null;
  className?: string;
  variant: IpLocationTextVariant;
}) {
  const label = props.label?.trim();

  if (!label) {
    return null;
  }

  return (
    <span className={cn("text-[0.72rem] text-muted-foreground", props.className)}>
      {props.variant === "profile" ? `IP属地:${label}` : label}
    </span>
  );
}
