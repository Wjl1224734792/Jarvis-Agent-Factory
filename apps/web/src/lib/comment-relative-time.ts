import { useEffect, useState } from "react";

const MS_MIN = 60_000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

/**
 * 基于评论首发时间 `createdAt` 的展示文案（不随 `updatedAt` 变化）。
 * 相对区间外仅显示年月日（不含时分）。
 */
export function formatCommentPublishedTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return "";
  }

  const diff = now.getTime() - then;
  if (diff < 0) {
    return new Date(iso).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    });
  }

  if (diff < MS_MIN) {
    return "刚刚";
  }
  if (diff < MS_HOUR) {
    return `${Math.floor(diff / MS_MIN)} 分钟前`;
  }
  if (diff < MS_DAY) {
    return `${Math.floor(diff / MS_HOUR)} 小时前`;
  }
  if (diff < 7 * MS_DAY) {
    return `${Math.floor(diff / MS_DAY)} 天前`;
  }

  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  });
}

export function useCommentPublishedTimeLabel(createdAt: string): string {
  const [label, setLabel] = useState(() => formatCommentPublishedTime(createdAt));

  useEffect(() => {
    setLabel(formatCommentPublishedTime(createdAt));
    const id = window.setInterval(() => {
      setLabel(formatCommentPublishedTime(createdAt));
    }, 60_000);
    return () => {
      window.clearInterval(id);
    };
  }, [createdAt]);

  return label;
}
