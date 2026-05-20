export interface LinkCardData {
  type: string;
  title?: string;
  coverUrl?: string | null;
  description?: string | null;
  href: string;
}

const TYPE_LABELS: Record<string, string> = {
  model: "飞行器",
  post: "文章",
  circle: "飞友圈",
};

/**
 * 将 link-preview API 返回的数据构建为编辑器中的链接卡片 HTML。
 * 使用 data-link-card-* 属性标识，display 时通过 CSS 渲染为卡片样式。
 */
export function buildLinkCardHtml(data: LinkCardData): string {
  const label = TYPE_LABELS[data.type] ?? "链接";
  const coverHtml = data.coverUrl
    ? `<img src="${escapeAttr(data.coverUrl)}" alt="" class="link-card__cover" />`
    : `<div class="link-card__cover-placeholder"></div>`;
  const titleHtml = data.title
    ? `<span class="link-card__title">${escapeHtml(data.title)}</span>`
    : "";
  const descHtml = data.description
    ? `<span class="link-card__desc">${escapeHtml(data.description)}</span>`
    : "";

  return (
    `<a class="link-card" href="${escapeAttr(data.href)}"` +
    ` target="_blank" rel="noopener noreferrer nofollow"` +
    ` data-link-card-type="${escapeAttr(data.type)}"` +
    ` data-link-card-title="${escapeAttr(data.title ?? "")}"` +
    ` data-link-card-cover="${escapeAttr(data.coverUrl ?? "")}">` +
    `${coverHtml}` +
    `<span class="link-card__body">` +
    `<span class="link-card__label">${escapeHtml(label)}</span>` +
    `${titleHtml}${descHtml}` +
    `</span>` +
    `</a>`
  );
}

export function buildUnknownLinkCardHtml(url: string): string {
  return (
    `<a class="link-card link-card--unknown" href="${escapeAttr(url)}"` +
    ` target="_blank" rel="noopener noreferrer nofollow"` +
    ` data-link-card-type="unknown">` +
    `<span class="link-card__body">` +
    `<span class="link-card__label">外部链接</span>` +
    `<span class="link-card__url">${escapeHtml(url)}</span>` +
    `</span>` +
    `</a>`
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\//g, "&#x2F;");
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
