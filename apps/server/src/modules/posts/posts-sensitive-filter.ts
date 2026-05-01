export const postsSensitiveFilterService = {
  scanText: async (_text: string) => ({ hasSensitive: false, words: [] as string[] }),
};
