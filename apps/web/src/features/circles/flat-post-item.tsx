import { HeartIcon, MessageCircleIcon, PlayIcon } from 'lucide-react';
import { memo, useCallback } from 'react';
import { ProfileLink } from '@/components/profile-link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveUserAvatarSrc } from '@/lib/avatar-url';

// ── 帖子 Feed 项类型（从 API 响应映射后的完整结构） ──

/** 圈子帖子 Feed 项——列表扁平化展示所需的精简字段 */
export interface CircleFeedItem {
  id: string;
  title: string;
  contentPreview?: string | null;
  source?: {
    label: string;
    url?: string | null;
  } | null;
  cover?: { url?: string | null } | null;
  images: Array<{ url?: string | null }>;
  videos: Array<{ url?: string | null }>;
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    ipLocationLabel?: string | null;
  };
  engagement: {
    likeCount: number;
    commentCount?: number;
  };
  /** 圈子信息——推荐/关注 Feed 时填充 */
  circle?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  createdAt?: string | null;
}

/**
 * TASK-001 冻结接口：CirclePostFeedItem 类型别名。
 * 与 CircleFeedItem 等价，供后续 TASK 按 DDD 文档引用。
 */
export type CirclePostFeedItem = CircleFeedItem;

// ── FlatPostItem Props（冻结接口，后续任务不得修改） ──

interface FlatPostItemProps {
  /** 帖子数据 */
  post: CircleFeedItem;
  /** 是否显示来源圈子标记（默认 true） */
  showSourceCircle?: boolean;
  /** 点击回调（TASK-004 SlidePanel 使用） */
  onPostClick?: (postId: string) => void;
}

// ── 工具函数 ──

function relativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return '刚刚';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

function formatCount(value: number): string {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, '')}w`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(value);
}

// ── 组件 ──

/**
 * 贴吧式扁平列表帖子项。
 *
 * 渲染结构：来源圈子头像+名称（showSourceCircle=true 时）
 * → 标题 → 正文截断 → 图片/视频缩略图 → 底部互动栏
 *
 * 无卡片包裹，使用 border-b 分隔。
 */
const FlatPostItem = memo(function FlatPostItem({
  post,
  showSourceCircle = true,
  onPostClick,
}: FlatPostItemProps) {
  const previewImage = post.cover?.url ?? post.images[0]?.url ?? null;
  const previewVideo = post.videos[0]?.url ?? null;
  const hasMedia = Boolean(previewImage) || Boolean(previewVideo);

  /** 键盘事件处理：Enter/Space 触发点击，保持无障碍可访问性 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPostClick?.(post.id);
      }
    },
    [onPostClick, post.id],
  );

  /** 阻止 ProfileLink 点击冒泡到父级 div，避免同时触发帖子详情打开 */
  const handleProfileLinkClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
    },
    [],
  );

  return (
    <div
      className="flex w-full gap-3 px-4 py-3 text-left border-b border-border/40 hover:bg-gray-100/60 transition-colors cursor-pointer"
      onClick={() => onPostClick?.(post.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* 来源圈子头像（showSourceCircle=true 时显示圈子头像，否则显示作者头像） */}
      <Avatar className="size-10 shrink-0 mt-0.5" size="sm">
        <AvatarImage
          alt={showSourceCircle ? (post.circle?.name ?? '') : post.author.displayName}
          src={resolveUserAvatarSrc(post.author.avatarUrl)}
        />
        <AvatarFallback>
          {(showSourceCircle ? post.circle?.name : post.author.displayName)?.slice(0, 1) ?? ''}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* 来源圈子标记 */}
        {showSourceCircle && post.circle ? (
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs text-primary font-medium truncate">
              {post.circle.name}
            </span>
          </div>
        ) : null}

        {/* 帖子标题 */}
        <h2 className="font-semibold text-[0.92rem] leading-[1.35rem] line-clamp-2 text-foreground">
          {post.title}
        </h2>

        {/* 正文预览（最多 3 行截断） */}
        {post.contentPreview ? (
          <p className="text-sm text-muted-foreground line-clamp-3 mt-0.5 leading-[1.35rem]">
            {post.contentPreview}
          </p>
        ) : null}

        {/* 图片/视频缩略图（最大高度 256px） */}
        {hasMedia ? (
          <div className="mt-2 overflow-hidden rounded-xl">
            {previewVideo ? (
              <div className="relative">
                <video
                  className="w-full max-h-64 object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  src={previewVideo}
                />
                <span className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white">
                  <PlayIcon className="size-4 fill-current" />
                </span>
              </div>
            ) : (
              <img
                alt={post.title}
                className="w-full max-h-64 object-cover"
                src={previewImage!}
              />
            )}
          </div>
        ) : null}

        {/* 底部互动栏：作者 | 来源 | 评论数 | 点赞数 | 时间 */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span onClick={handleProfileLinkClick}>
            <ProfileLink className="truncate hover:text-foreground" userId={post.author.id}>
              {post.author.displayName}
            </ProfileLink>
          </span>
          {post.source ? (
            <span className="truncate text-muted-foreground/70">
              来自{post.source.label}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1 shrink-0">
            <MessageCircleIcon className="size-3" />
            {formatCount(post.engagement.commentCount ?? 0)}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0">
            <HeartIcon className="size-3" />
            {formatCount(post.engagement.likeCount)}
          </span>
          <span className="shrink-0">{relativeTime(post.createdAt)}</span>
        </div>
      </div>
    </div>
  );
});

FlatPostItem.displayName = 'FlatPostItem';

export { FlatPostItem };
