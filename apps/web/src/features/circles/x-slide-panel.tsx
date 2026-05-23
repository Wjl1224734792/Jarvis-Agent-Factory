import { useEffect, useCallback, useRef, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';
import { useSlidePanelStore } from './use-slide-panel-store';
import { CirclePostDetailContent } from '@/routes/circle-page-detail';

// ── 拖拽关闭阈值（px） ──

const DRAG_CLOSE_THRESHOLD = 100;

// ── 组件 ──

/**
 * X 式侧滑面板——帖子详情从右侧滑入。
 *
 * 桌面端宽度 420px，移动端全屏（100vw）。
 * 支持拖拽关闭、遮罩关闭、Escape 关闭、body 滚动锁定。
 */
export function XSlidePanel() {
  const postId = useSlidePanelStore(s => s.postId);
  const circleId = useSlidePanelStore(s => s.circleId);
  const isOpen = useSlidePanelStore(s => s.isOpen);
  const isClosing = useSlidePanelStore(s => s.isClosing);
  const close = useSlidePanelStore(s => s.close);

  // ── 左侧拖拽调整宽度 ──
  const [panelWidth, setPanelWidth] = useState(420);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(420);

  /** 开始拖拽——记录起始位置和当前宽度 */
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dragStartXRef.current = clientX;
      dragStartWidthRef.current = panelWidth;
    },
    [panelWidth],
  );

  // 监听 document 级别的 mousemove/touchmove/mouseup/touchend
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const delta = clientX - dragStartXRef.current;
      // 向左拖（delta < 0）→ 面板变宽；向右拖（delta > 0）→ 面板变窄
      const newWidth = Math.min(800, Math.max(320, dragStartWidthRef.current - delta));
      setPanelWidth(newWidth);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // body 滚动锁定——cleanup 时检查 store 状态，避免其他面板实例仍打开时误恢复 overflow
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      if (!useSlidePanelStore.getState().isOpen) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const dragDistance = info.offset.x;
      const velocity = info.velocity.x;

      // 向右拖拽超过阈值或快速向右滑动 -> 关闭
      if (dragDistance > DRAG_CLOSE_THRESHOLD || velocity > 500) {
        close();
      }
      // 否则回弹（Framer Motion 自动处理）
    },
    [close]
  );

  // 不渲染（面板关闭且不在关闭动画中）
  if (!isOpen && !isClosing) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) close(); }}>
      <SheetContent
        className="w-screen max-w-none p-0 relative"
        showCloseButton={false}
        side="right"
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? panelWidth : undefined }}
      >
        {/* 拖拽调整宽度时的全屏遮罩，防止 Framer Motion 拦截事件 */}
        {isDragging ? (
          <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
        ) : null}

        {/* 左侧拖拽手柄——仅桌面端可见 */}
        <div
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-1.5 h-12 rounded-full bg-border hover:bg-primary/50 cursor-col-resize items-center justify-center transition-colors"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        />

        {/* Framer Motion 拖拽层包裹整个面板内容 */}
        <motion.div
          className="flex h-full flex-col"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ touchAction: 'pan-y' }}
        >
          {/* 顶部栏：标题 + 关闭按钮 */}
          <SheetHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <SheetTitle className="text-base">帖子详情</SheetTitle>
            <SheetDescription className="sr-only">
              帖子详情面板
            </SheetDescription>
            <Button
              onClick={close}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <XIcon className="size-4" />
              <span className="sr-only">关闭</span>
            </Button>
          </SheetHeader>

          {/* 面板主体内容区——帖子详情 + 评论 */}
          <div className="flex-1 overflow-y-auto">
            {postId ? (
              <CirclePostDetailContent circleId={circleId} postId={postId} />
            ) : null}
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
