import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap border border-transparent font-medium transition-[transform,background-color,border-color,color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/92 hover:shadow-[var(--shadow-float)]",
        hero:
          "bg-panel-highlight text-panel-highlight-foreground shadow-[var(--shadow-float)] hover:brightness-[1.02]",
        outline:
          "border-border bg-card/92 text-foreground hover:border-primary/20 hover:bg-accent/70 hover:text-foreground",
        panel:
          "border-border/80 bg-surface-1 text-foreground shadow-[var(--shadow-soft)] hover:border-primary/16 hover:bg-surface-2",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/86",
        ghost:
          "text-foreground/72 hover:bg-accent/72 hover:text-foreground",
        nav:
          "border-transparent bg-transparent text-foreground/70 hover:bg-accent/68 hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-[var(--shadow-soft)]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/16 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 rounded-[var(--radius-control)] px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-[calc(var(--radius-control)-0.25rem)] px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[calc(var(--radius-control)-0.15rem)] px-3 text-[0.82rem] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 rounded-[var(--radius-control)] px-4.5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xl: "h-13 gap-2.5 rounded-[calc(var(--radius-control)+0.2rem)] px-5 text-base has-data-[icon=inline-end]:pr-4.5 has-data-[icon=inline-start]:pl-4.5",
        icon: "size-10 rounded-[var(--radius-control)]",
        "icon-xs": "size-7 rounded-[calc(var(--radius-control)-0.25rem)] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-[calc(var(--radius-control)-0.15rem)]",
        "icon-lg": "size-11 rounded-[var(--radius-control)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
