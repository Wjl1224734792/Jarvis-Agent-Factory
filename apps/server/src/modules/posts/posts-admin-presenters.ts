import { postsRepo } from './posts.repo';
import {
  isOfficialArticlePost,
  serializePostListItem
} from './posts-presenters';
import {
  buildCoversByPostId,
  buildImagesByPostId,
  buildVideosByPostId
} from './post-media';

const ADMIN_POST_VIEWER = Object.freeze({
  isAuthor: false,
  isFollowingAuthor: false,
  hasLiked: false,
  hasFavorited: false,
  hasShared: false
});

type AdminPostItem = Awaited<ReturnType<typeof postsRepo.listAdminPosts>>[number];
type PostDetail = NonNullable<Awaited<ReturnType<typeof postsRepo.getPostById>>>;

async function loadInternalPostMedia(items: Array<{ id: string; coverImageFileId: string | null }>) {
  const [images, videos] = await Promise.all([
    postsRepo.listPostImages(items.map(item => item.id)),
    postsRepo.listPostVideos(items.map(item => item.id))
  ]);
  const [imagesByPostId, videosByPostId, coversByPostId] = await Promise.all([
    buildImagesByPostId(images, 'internal'),
    buildVideosByPostId(videos, 'internal'),
    buildCoversByPostId(items, 'internal')
  ]);

  return {
    imagesByPostId,
    videosByPostId,
    coversByPostId
  };
}

/**
 * 序列化后台帖子列表。
 *
 * @param items 后台帖子列表记录。
 * @returns 带有内部媒体地址的后台帖子列表响应。
 * @throws {Error} 当媒体查询失败时透传底层异常。
 */
export async function serializeAdminPostList(items: AdminPostItem[]) {
  const { imagesByPostId, videosByPostId, coversByPostId } =
    await loadInternalPostMedia(items);

  return {
    items: items
      .map(item =>
        serializePostListItem(item, {
          cover: coversByPostId.get(item.id) ?? null,
          images: imagesByPostId.get(item.id) ?? [],
          videos: videosByPostId.get(item.id) ?? [],
          viewer: ADMIN_POST_VIEWER
        })
      )
      .filter((item): item is NonNullable<typeof item> => item !== null)
  };
}

/**
 * 序列化后台官方文章详情。
 *
 * @param item 帖子详情记录。
 * @returns 官方文章详情响应；非官方文章时返回 `null`。
 * @throws {Error} 当媒体查询失败时透传底层异常。
 */
export async function serializeAdminOfficialArticleDetail(item: PostDetail | null) {
  if (!item || !isOfficialArticlePost(item)) {
    return null;
  }

  const officialArticle = item;
  const { imagesByPostId, videosByPostId, coversByPostId } =
    await loadInternalPostMedia([officialArticle]);
  const serialized = serializePostListItem(officialArticle, {
    cover: coversByPostId.get(officialArticle.id) ?? null,
    images: imagesByPostId.get(officialArticle.id) ?? [],
    videos: videosByPostId.get(officialArticle.id) ?? [],
    viewer: ADMIN_POST_VIEWER
  });

  if (!serialized) {
    return null;
  }

  return {
    item: {
      ...serialized,
      content: officialArticle.content,
      comments: []
    }
  };
}
