import { describe, expect, it } from 'vitest';
import {
  hasInvalidMomentMediaSelection,
  isArticleCategoryMissing,
  normalizeCoverImageId,
  resolveMomentCoverImageId,
  validatePostMediaOwnership
} from '../src/modules/posts/posts-write-guards';

describe('posts write guards', () => {
  it('normalizes cover image ids', () => {
    expect(normalizeCoverImageId('  cover_1  ')).toBe('cover_1');
    expect(normalizeCoverImageId('   ')).toBeNull();
    expect(normalizeCoverImageId(null)).toBeNull();
  });

  it('resolves moment cover image ids from current image list', async () => {
    await expect(
      resolveMomentCoverImageId({
        postType: 'moment',
        imageIds: ['image_1', 'image_2'],
        coverImageId: null
      })
    ).resolves.toEqual({
      kind: 'ok',
      coverImageId: 'image_1'
    });

    await expect(
      resolveMomentCoverImageId({
        postType: 'moment',
        imageIds: ['image_1', 'image_2'],
        coverImageId: 'image_2'
      })
    ).resolves.toEqual({
      kind: 'ok',
      coverImageId: 'image_2'
    });
  });

  it('rejects invalid moment cover image ids', async () => {
    await expect(
      resolveMomentCoverImageId({
        postType: 'moment',
        imageIds: ['image_1'],
        coverImageId: 'image_2'
      })
    ).resolves.toEqual({
      kind: 'invalid_cover'
    });

    await expect(
      resolveMomentCoverImageId({
        postType: 'moment',
        imageIds: [],
        coverImageId: 'image_3',
        validateDetachedCoverImageId: async () => false
      })
    ).resolves.toEqual({
      kind: 'invalid_cover'
    });
  });

  it('returns null cover for article posts and checks article category requirement', async () => {
    await expect(
      resolveMomentCoverImageId({
        postType: 'article',
        imageIds: ['image_1'],
        coverImageId: 'image_1'
      })
    ).resolves.toEqual({
      kind: 'ok',
      coverImageId: null
    });

    expect(isArticleCategoryMissing('article', null)).toBe(true);
    expect(isArticleCategoryMissing('article', 'category_1')).toBe(false);
    expect(isArticleCategoryMissing('moment', null)).toBe(false);
  });

  it('deduplicates and validates media ownership', async () => {
    await expect(
      validatePostMediaOwnership({
        imageIds: ['image_1', 'image_1', 'image_2'],
        videoIds: ['video_1', 'video_1'],
        listImageRecords: async imageIds => imageIds.map(id => ({ id })),
        listVideoRecords: async videoIds => videoIds.map(id => ({ id }))
      })
    ).resolves.toEqual({
      kind: 'ok',
      imageIds: ['image_1', 'image_2'],
      videoIds: ['video_1']
    });
  });

  it('returns invalid media ownership errors', async () => {
    await expect(
      validatePostMediaOwnership({
        imageIds: ['image_1'],
        videoIds: [],
        listImageRecords: async () => [],
        listVideoRecords: async () => []
      })
    ).resolves.toEqual({
      kind: 'invalid_images'
    });

    await expect(
      validatePostMediaOwnership({
        imageIds: [],
        videoIds: ['video_1'],
        listImageRecords: async () => [],
        listVideoRecords: async () => []
      })
    ).resolves.toEqual({
      kind: 'invalid_videos'
    });
  });

  it('detects invalid moment media combinations', () => {
    expect(
      hasInvalidMomentMediaSelection('moment', ['image_1'], ['video_1'])
    ).toBe(true);
    expect(
      hasInvalidMomentMediaSelection('moment', [], ['video_1', 'video_2'])
    ).toBe(true);
    expect(
      hasInvalidMomentMediaSelection('moment', ['image_1'], [])
    ).toBe(false);
  });
});
