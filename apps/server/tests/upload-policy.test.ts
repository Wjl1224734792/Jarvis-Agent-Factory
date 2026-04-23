import { afterEach, describe, expect, it } from "vitest";
import { getUploadPolicy } from "../src/modules/uploads/upload.policy";
import { restoreEnvValues } from "./env-test-helpers";

const originalEnv = {
  file: process.env.UPLOAD_MAX_FILE_SIZE_MB,
  image: process.env.UPLOAD_MAX_IMAGE_SIZE_MB,
  video: process.env.UPLOAD_MAX_VIDEO_SIZE_MB,
  avatar: process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB,
  report: process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB,
  postVideo: process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB
};

afterEach(() => {
  restoreEnvValues({
    UPLOAD_MAX_FILE_SIZE_MB: originalEnv.file,
    UPLOAD_MAX_IMAGE_SIZE_MB: originalEnv.image,
    UPLOAD_MAX_VIDEO_SIZE_MB: originalEnv.video,
    UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB: originalEnv.avatar,
    UPLOAD_MAX_REPORT_IMAGE_SIZE_MB: originalEnv.report,
    UPLOAD_MAX_POST_VIDEO_SIZE_MB: originalEnv.postVideo
  });
});

describe("upload policy limits", () => {
  it("uses the default limit when no env override is configured", () => {
    delete process.env.UPLOAD_MAX_FILE_SIZE_MB;
    delete process.env.UPLOAD_MAX_IMAGE_SIZE_MB;
    delete process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB;

    const policy = getUploadPolicy("avatar-image");
    expect(policy.maxSize).toBe(5 * 1024 * 1024);
  });

  it("uses the smallest value across default, global, media and biz-type overrides", () => {
    process.env.UPLOAD_MAX_FILE_SIZE_MB = "20";
    process.env.UPLOAD_MAX_IMAGE_SIZE_MB = "8";
    process.env.UPLOAD_MAX_AVATAR_IMAGE_SIZE_MB = "2";

    const policy = getUploadPolicy("avatar-image");
    expect(policy.maxSize).toBe(2 * 1024 * 1024);
  });

  it("supports report-image specific overrides independently from generic image limits", () => {
    process.env.UPLOAD_MAX_FILE_SIZE_MB = "20";
    process.env.UPLOAD_MAX_IMAGE_SIZE_MB = "10";
    process.env.UPLOAD_MAX_REPORT_IMAGE_SIZE_MB = "3";

    const policy = getUploadPolicy("report-image");
    expect(policy.maxSize).toBe(3 * 1024 * 1024);
  });

  it("supports post-video specific overrides independently from generic video limits", () => {
    process.env.UPLOAD_MAX_FILE_SIZE_MB = "200";
    process.env.UPLOAD_MAX_VIDEO_SIZE_MB = "80";
    process.env.UPLOAD_MAX_POST_VIDEO_SIZE_MB = "50";

    const policy = getUploadPolicy("post-video");
    expect(policy.maxSize).toBe(50 * 1024 * 1024);
  });
});
