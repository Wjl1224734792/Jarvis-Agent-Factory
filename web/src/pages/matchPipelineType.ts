/**
 * 流程分类匹配 -- 根据 agent ID 判断所属流程
 * @param id - 智能体 ID
 * @param type - 流程分类值
 */
export function matchPipelineType(id: string, type: string): boolean {
  const idLower = id.toLowerCase();
  const idStartsWith = (prefix: string) => idLower.startsWith(prefix);
  const idIncludes = (seg: string) => idLower.includes(seg);

  switch (type) {
    case '全流程':
      return (
        idStartsWith('frontend-') || idStartsWith('backend-') ||
        ['infra-deploy', 'api-contract', 'frontend-debug-expert',
          'qa-review', 'security-review', 'perf-review', 'perf-test',
          'diff-review', 'project-review', 'change-review',
          'test-doc-writer', 'test-executor'].some(n => idStartsWith(n)) ||
        ['code-explore', 'remediation'].includes(idLower)
      );
    case '前端':
      return idStartsWith('frontend-');
    case '后端':
      return idStartsWith('backend-');
    case '轻量':
      return (
        idStartsWith('auto') ||
        idStartsWith('jarvis-lite') ||
        ['remediation-expert']
          .some(n => idLower === n || idStartsWith(n))
      );
    case '移动端':
      return (
        idStartsWith('android-') || idStartsWith('ios-') ||
        idStartsWith('flutter-') || idIncludes('expo') ||
        idStartsWith('taro-') || idStartsWith('react-native-')
      );
    case '架构':
      return idIncludes('architect') || idLower === 'algorithm-expert';
    case '测试':
      return (
        idIncludes('-test-') ||
        ['browser-test', 'e2e-test', 'api-test', 'perf-test',
          'test-doc', 'test-executor'].some(n => idLower === n || idStartsWith(n))
      );
    case '审查':
      return (
        idIncludes('-review-') ||
        ['review', 'change-review', 'diff-review', 'project-review',
          'qa-review', 'security-review', 'perf-review'].some(n => idLower === n || idStartsWith(n))
      );
    default:
      return true;
  }
}
