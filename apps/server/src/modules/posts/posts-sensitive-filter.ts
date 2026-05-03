type SensitiveField = "title" | "content";

type SensitiveDetection = {
  matchedWords: string[];
  fields: SensitiveField[];
};

const DEFAULT_POST_SENSITIVE_WORDS = [
  "forbiddenword",
  "extremism",
  "违禁词测试",
  "赌博网站",
  "刷单诈骗",
  "买卖枪支"
] as const;

const NON_TEXT_CHARS = /[^a-z0-9\u4e00-\u9fff]/g;

function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(NON_TEXT_CHARS, "");
}

const normalizedSensitiveWords = DEFAULT_POST_SENSITIVE_WORDS.map((word) => ({
  raw: word,
  normalized: normalizeText(word)
})).filter((word) => word.normalized.length > 0);

/**
 * Keeps post-sensitive-word checks in a single posts-domain service so
 * publishing and update flows share one consistent detection baseline.
 */
export const postsSensitiveFilterService = {
  inspect(input: { title: string; content: string }) {
    const fieldText: Record<SensitiveField, string> = {
      title: normalizeText(input.title),
      content: normalizeText(input.content)
    };

    const matchedWords: string[] = [];
    const fields = new Set<SensitiveField>();

    for (const word of normalizedSensitiveWords) {
      let hit = false;

      for (const field of Object.keys(fieldText) as SensitiveField[]) {
        const normalizedFieldText = fieldText[field];
        if (!normalizedFieldText) {
          continue;
        }

        if (normalizedFieldText.includes(word.normalized)) {
          fields.add(field);
          hit = true;
        }
      }

      if (hit) {
        matchedWords.push(word.raw);
      }
    }

    if (matchedWords.length === 0) {
      return { ok: true as const };
    }

    return {
      ok: false as const,
      detection: {
        matchedWords,
        fields: [...fields]
      } satisfies SensitiveDetection
    };
  }
};