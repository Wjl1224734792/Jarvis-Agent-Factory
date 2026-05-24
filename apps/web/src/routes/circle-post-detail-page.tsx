import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { SitePage } from '@/components/site-shell';
import { CirclePostDetailContent } from './circle-page-detail';

/**
 * 帖子详情独立路由页面。
 *
 * 替代不可靠的 SlidePanel 方案，通过独立路由展示帖子详情内容。
 * 从 URL 中读取 postId 和可选的 circleId，渲染自包含的 CirclePostDetailContent。
 */
export function CirclePostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const [searchParams] = useSearchParams();
  const circleId = searchParams.get('circleId');
  const navigate = useNavigate();

  if (!postId) {
    return (
      <SitePage className="bg-transparent">
        <div className="mx-auto max-w-[680px] px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">帖子不存在</p>
        </div>
      </SitePage>
    );
  }

  return (
    <SitePage className="bg-transparent">
      <div className="mx-auto w-full max-w-[680px]">
        {/* 返回导航 */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowLeftIcon className="size-4" />
            返回
          </button>
        </div>
        {/* 帖子详情内容 */}
        <CirclePostDetailContent circleId={circleId} postId={postId} />
      </div>
    </SitePage>
  );
}
