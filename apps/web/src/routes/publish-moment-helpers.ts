export function canAppendMomentImages(currentImageCount: number, incomingCount: number) {
  return currentImageCount + incomingCount <= 6;
}

export function canReplaceWithMomentVideo(incomingCount: number) {
  return incomingCount === 1;
}

export function canSubmitMomentMedia(imageCount: number, videoCount: number) {
  return !(imageCount > 0 && videoCount > 0) && videoCount <= 1;
}
