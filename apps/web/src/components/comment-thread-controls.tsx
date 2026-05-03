import type { ComponentType, MouseEvent, ReactNode, SVGProps } from "react";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommentLikeIconButton(props: {
  likeCount: number;
  hasLiked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={cn(
        "group inline-flex h-auto min-h-0 w-fit gap-1 border-0 bg-transparent px-0 py-0 text-[0.72rem] shadow-none md:h-auto",
        "active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1",
        "hover:bg-transparent"
      )}
      disabled={props.disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        props.onClick();
      }}
      type="button"
      variant="ghost"
    >
      <span
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
          props.hasLiked
            ? "bg-rose-50 text-like-red group-hover:bg-rose-100"
            : "text-muted-foreground group-hover:bg-rose-50/70 group-hover:text-foreground"
        )}
      >
        <HeartIcon
          className={cn(
            "size-3.5 transition-transform duration-150 ease-out group-active:scale-[0.92]",
            props.hasLiked
              ? "fill-like-red text-like-red motion-safe:animate-[reaction-pop_220ms_cubic-bezier(0.2,0.9,0.2,1)]"
              : "text-current"
          )}
          fill={props.hasLiked ? "currentColor" : "none"}
          strokeWidth={props.hasLiked ? 1.7 : 2}
        />
      </span>
      <span
        className={cn(
          "tabular-nums transition-colors",
          props.hasLiked ? "text-like-red" : "text-muted-foreground group-hover:text-foreground"
        )}
      >
        {props.likeCount}
      </span>
    </Button>
  );
}

export function CommentIconOnlyButton(props: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  disabled: boolean;
  onClick: () => void;
  active?: boolean;
  destructiveHover?: boolean;
}) {
  const Icon = props.icon;
  return (
    <Button
      className="group inline-flex size-auto min-h-0 shrink-0 items-center justify-center rounded-none border-0 bg-transparent p-0.5 shadow-none hover:!bg-transparent active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1"
      disabled={props.disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        props.onClick();
      }}
      type="button"
      variant="ghost"
    >
      <Icon
        className={cn(
          "size-3.5 transition-transform duration-150 ease-out group-active:scale-[0.92]",
          props.active
            ? "text-primary motion-safe:animate-[reaction-pop_220ms_cubic-bezier(0.2,0.9,0.2,1)]"
            : "text-muted-foreground group-hover:text-foreground",
          props.destructiveHover && "group-hover:text-destructive"
        )}
      />
      <span className="sr-only">{props.label}</span>
    </Button>
  );
}

export function CommentTextAction(props: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant: "reply" | "report";
  hasReported?: boolean;
  className?: string;
}) {
  return (
    <Button
      className={cn(
        "h-6 rounded-full px-2 text-[0.72rem] transition-colors hover:!bg-transparent active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1",
        props.variant === "reply" && "text-muted-foreground hover:text-primary",
        props.variant === "report" &&
          cn(
            props.hasReported ? "text-orange-600/90 dark:text-orange-400" : "text-muted-foreground",
            "hover:text-orange-600 dark:hover:text-orange-400"
          ),
        props.className
      )}
      disabled={props.disabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        props.onClick?.();
      }}
      type="button"
      variant="ghost"
    >
      {props.children}
    </Button>
  );
}
