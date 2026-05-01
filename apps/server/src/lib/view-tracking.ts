export const VIEW_SESSION_HEADER = "x-feijia-view-session";

export async function shouldCountUniqueView(_opts: {
  contentType: string;
  contentId: string;
  sessionId: string | null;
  viewerId: string | null;
  viewerFingerprint: string | null;
}): Promise<boolean> {
  return true;
}
