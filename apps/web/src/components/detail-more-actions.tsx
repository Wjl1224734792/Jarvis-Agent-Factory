import type { ComponentProps, ReactNode } from "react";
import {
  AlertTriangleIcon,
  MoreHorizontalIcon,
  PencilLineIcon,
  Trash2Icon,
  type LucideIcon
} from "lucide-react";
import { ReportActionSheet } from "@/components/report-action-sheet";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import {
  getDetailMoreActionTypes,
  type DetailMoreActionType
} from "./detail-more-actions-state";

type ReportInput = { reason: string; imageIds: string[] };

type DetailMoreActionsProps = {
  isOwner: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canReport?: boolean;
  isAuthenticated?: boolean;
  report?: {
    title: string;
    description?: string;
    hasReported?: boolean;
    onSubmit: (input: ReportInput) => Promise<void>;
  };
  onEdit?: () => void;
  onDelete?: () => void;
  onRequireLogin?: () => void;
  mode?: "rail" | "inline";
  className?: string;
  triggerClassName?: string;
  contentSide?: "top" | "right" | "bottom" | "left";
  contentAlign?: "start" | "center" | "end";
};

function ActionContent(props: {
  icon: LucideIcon;
  label: string;
}) {
  const Icon = props.icon;

  return (
    <>
      <Icon data-icon="inline-start" />
      <span>{props.label}</span>
    </>
  );
}

function ActionButton({
  children,
  destructive,
  compact,
  className,
  ...buttonProps
}: ComponentProps<typeof Button> & {
  children: ReactNode;
  destructive?: boolean;
  compact?: boolean;
}) {
  return (
    <Button
      {...buttonProps}
      className={cn(
        "w-full justify-start rounded-none shadow-none",
        compact && "w-auto rounded-full",
        destructive && "text-destructive hover:text-destructive",
        className
      )}
      size="sm"
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

function MoreTrigger({
  className,
  reported,
  ...buttonProps
}: ComponentProps<typeof Button> & { reported?: boolean }) {
  return (
    <Button
      {...buttonProps}
      aria-label={reported ? "更多操作，已举报" : "更多操作"}
      className={cn("rounded-full", reported && "text-orange-700", className)}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <MoreHorizontalIcon />
    </Button>
  );
}

export function DetailMoreActions({
  isOwner,
  canEdit = false,
  canDelete = false,
  canReport = true,
  isAuthenticated = false,
  report,
  onEdit,
  onDelete,
  onRequireLogin,
  mode = "rail",
  className,
  triggerClassName,
  contentSide = "right",
  contentAlign = "center"
}: DetailMoreActionsProps) {
  const actions = getDetailMoreActionTypes({
    isOwner,
    canEdit: canEdit && Boolean(onEdit),
    canDelete: canDelete && Boolean(onDelete),
    canReport: canReport && Boolean(report)
  });

  if (actions.length === 0) {
    return null;
  }

  function renderReportAction(compact: boolean) {
    if (!report) {
      return null;
    }

    const label = report.hasReported ? "已举报" : "举报";
    const content = (
      <ActionContent icon={AlertTriangleIcon} label={label} />
    );

    if (!isAuthenticated) {
      return (
        <ActionButton
          compact={compact}
          destructive
          onClick={() => {
            onRequireLogin?.();
          }}
        >
          {content}
        </ActionButton>
      );
    }

    return (
      <ReportActionSheet
        description={report.description}
        onSubmit={report.onSubmit}
        title={report.title}
        trigger={
          <ActionButton compact={compact} destructive>
            {content}
          </ActionButton>
        }
      />
    );
  }

  function renderAction(type: DetailMoreActionType, compact = false) {
    if (type === "report") {
      return <div key={type}>{renderReportAction(compact)}</div>;
    }

    if (type === "edit") {
      return (
        <ActionButton compact={compact} key={type} onClick={onEdit}>
          <ActionContent icon={PencilLineIcon} label="编辑" />
        </ActionButton>
      );
    }

    return (
      <ActionButton compact={compact} destructive key={type} onClick={onDelete}>
        <ActionContent icon={Trash2Icon} label="删除" />
      </ActionButton>
    );
  }

  if (mode === "inline") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {actions.map((action) => renderAction(action, true))}
      </div>
    );
  }

  return (
    <HoverCard closeDelay={90} openDelay={80}>
      <HoverCardTrigger asChild>
        <MoreTrigger className={triggerClassName} reported={report?.hasReported} />
      </HoverCardTrigger>
      <HoverCardContent
        align={contentAlign}
        className={cn("w-36 rounded-none p-1", className)}
        side={contentSide}
      >
        <div className="flex flex-col gap-1">
          {actions.map((action) => renderAction(action))}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
