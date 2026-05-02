export async function resolvePublicUploadedFileUrlMap(..._args: unknown[]): Promise<any> { return null; }
export async function resolveUploadedFileUrl(fileId: string | null): Promise<string | null> {
  if (!fileId) return null;
  return `/api/v1/files/${fileId}/content`;
}

export async function resolveUploadedFileUrls<T>(items: T[]): Promise<T[]> {
  return items;
}

export async function resolveUploadedFileUrlMap(fileIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const id of fileIds) {
    map.set(id, await resolveUploadedFileUrl(id));
  }
  return map;
}

export async function resolvePublicUploadedFileUrl(fileId: string | null): Promise<string | null> {
  return resolveUploadedFileUrl(fileId);
}

export async function resolvePublicUploadedFileUrlMap(fileIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const id of fileIds) {
    map.set(id, await resolvePublicUploadedFileUrl(id));
  }
  return map;
}
