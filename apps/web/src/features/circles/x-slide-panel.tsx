import { useEffect, useCallback } from 'react';
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
        className="w-screen md:w-[420px] p-0"
        showCloseButton={false}
        side="right"
      >
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
