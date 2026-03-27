import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-3 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center text-muted-foreground group-data-horizontal/tabs:min-h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default:
          "gap-1 rounded-[calc(var(--radius-control)+0.15rem)] border border-border/80 bg-card/92 p-1 shadow-[var(--shadow-soft)]",
        pills:
          "gap-2 rounded-[calc(var(--radius-control)+0.1rem)] border border-border/80 bg-surface-2 p-1",
        line: "gap-2 rounded-none border-0 bg-transparent p-0",
        ghost: "gap-2 rounded-[calc(var(--radius-control)+0.05rem)] bg-transparent p-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap border border-transparent px-3 py-2 text-sm font-medium transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "site-tab-trigger",
        "group-data-[variant=default]/tabs-list:rounded-[calc(var(--radius-control)-0.1rem)] group-data-[variant=default]/tabs-list:text-foreground/68 group-data-[variant=default]/tabs-list:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:border-border/70 group-data-[variant=default]/tabs-list:data-active:bg-background group-data-[variant=default]/tabs-list:data-active:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-[var(--shadow-soft)]",
        "group-data-[variant=pills]/tabs-list:rounded-[calc(var(--radius-control)-0.1rem)] group-data-[variant=pills]/tabs-list:text-foreground/68 group-data-[variant=pills]/tabs-list:hover:text-foreground group-data-[variant=pills]/tabs-list:data-active:bg-primary group-data-[variant=pills]/tabs-list:data-active:text-primary-foreground",
        "group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:px-2.5 group-data-[variant=line]/tabs-list:text-foreground/62 group-data-[variant=line]/tabs-list:hover:text-foreground group-data-[variant=line]/tabs-list:data-active:text-primary",
        "group-data-[variant=line]/tabs-list:after:absolute group-data-[variant=line]/tabs-list:after:bottom-[-1px] group-data-[variant=line]/tabs-list:after:left-0 group-data-[variant=line]/tabs-list:after:h-0.5 group-data-[variant=line]/tabs-list:after:w-full group-data-[variant=line]/tabs-list:after:bg-primary group-data-[variant=line]/tabs-list:after:opacity-0 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        "group-data-[variant=ghost]/tabs-list:rounded-[calc(var(--radius-control)-0.1rem)] group-data-[variant=ghost]/tabs-list:text-muted-foreground group-data-[variant=ghost]/tabs-list:hover:bg-accent/72 group-data-[variant=ghost]/tabs-list:hover:text-foreground group-data-[variant=ghost]/tabs-list:data-active:bg-accent group-data-[variant=ghost]/tabs-list:data-active:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("site-tab-panel flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
