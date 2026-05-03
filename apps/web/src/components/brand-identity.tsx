import { cn } from "@/lib/utils";

type BrandIdentityProps = {
  name: string;
  logoUrl?: string | null;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
};

export function BrandIdentity(props: BrandIdentityProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", props.className)}>
      {props.logoUrl ? (
        <img
          alt={`${props.name} logo`}
          className={cn("size-4 shrink-0 object-contain", props.imageClassName)}
          src={props.logoUrl}
        />
      ) : null}
      <span className={cn("truncate", props.textClassName)}>{props.name}</span>
    </span>
  );
}
