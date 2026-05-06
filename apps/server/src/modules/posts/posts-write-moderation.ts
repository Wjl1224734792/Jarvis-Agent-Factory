import { evaluateTextModeration } from '../audits/text-moderation.service';
import { siteSettingsService } from '../site-settings/site-settings.service';

type PostType = 'article' | 'moment';

/**
 * 统一执行普通帖子写入后的审核决策。
 *
 * @param input 帖子类型、实体 ID 与待审核文本。
 * @returns 文本审核结果。
 * @throws {Error} 当审核模式查询或文本审核失败时透传异常。
 */
export async function evaluatePostWriteModeration(input: {
  postType: PostType;
  entityId: string;
  title: string;
  content: string;
}) {
  const mode = await siteSettingsService.getPostModerationMode(input.postType);

  return evaluateTextModeration({
    mode,
    domain: 'post',
    entityId: input.entityId,
    text: `${input.title}\n${input.content}`
  });
}
