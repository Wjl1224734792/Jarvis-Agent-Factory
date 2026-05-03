import { evaluateTextModeration } from '../audits/text-moderation.service';
import { siteSettingsService } from '../site-settings/site-settings.service';
import { postsSensitiveFilterService } from './posts-sensitive-filter';

type PostType = 'article' | 'moment';

type SensitiveInspection = ReturnType<typeof postsSensitiveFilterService.inspect>;
type SensitiveDetection = Exclude<SensitiveInspection, { ok: true }>['detection'];

type SensitiveGuardResult =
  | {
      kind: 'ok';
    }
  | {
      kind: 'sensitive_content';
      detection: SensitiveDetection;
    };

/**
 * 统一执行帖子写入前的敏感词检查。
 *
 * @param input 待检查的标题与正文。
 * @returns 通过时返回 `ok`，命中敏感词时返回标准化错误结果。
 * @throws {never} 该函数只封装本地敏感词检查，不会主动抛出异常。
 */
export function inspectPostWriteContent(input: {
  title: string;
  content: string;
}): SensitiveGuardResult {
  const sensitiveCheck = postsSensitiveFilterService.inspect({
    title: input.title,
    content: input.content
  });
  if (!sensitiveCheck.ok) {
    return {
      kind: 'sensitive_content',
      detection: sensitiveCheck.detection
    };
  }

  return {
    kind: 'ok'
  };
}

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
