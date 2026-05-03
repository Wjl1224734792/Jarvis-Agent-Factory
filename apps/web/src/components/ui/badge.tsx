import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "rounded-full bg-primary text-primary-foreground [a]:hover:bg-primary/84",
        secondary: "rounded-full bg-secondary text-secondary-foreground [a]:hover:bg-secondary/84",
        tone: "rounded-full bg-panel-info text-panel-info-foreground [a]:hover:bg-panel-info/92",
        eyebrow:
          "rounded-full border-border/80 bg-surface-2 text-muted-foreground uppercase tracking-[0.18em]",
        destructive:
          "rounded-full bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "rounded-full border-border bg-transparent text-foreground/78 [a]:hover:bg-accent/72 [a]:hover:text-foreground",
        ghost:
          "rounded-full bg-transparent text-muted-foreground hover:bg-accent/72 hover:text-foreground dark:hover:bg-muted/50",
        link: "rounded-none px-0 py-0 text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
