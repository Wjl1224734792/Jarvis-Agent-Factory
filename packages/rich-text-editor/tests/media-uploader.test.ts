import { describe, expect, it, vi } from "vitest";
import {
  collectBlobUrls,
  replaceBlobUrls,
  uploadMediaBatch,
} from "../src/media-uploader";

// ============================================================
// collectBlobUrls
// ============================================================

describe("collectBlobUrls", () => {
  it("提取 2 个 img blob URL（测试 1）", () => {
    const html =
      '<p><img src="blob:http://localhost/img1.png"/></p><p><img src="blob:http://localhost/img2.jpg"/></p>';
    const urls = collectBlobUrls(html);
    expect(urls).toHaveLength(2);
    expect(urls).toContain("blob:http://localhost/img1.png");
    expect(urls).toContain("blob:http://localhost/img2.jpg");
  });

  it("提取 img + video blob URL（测试 2）", () => {
    const html =
      '<img src="blob:http://localhost/photo.jpg"/><video src="blob:http://localhost/video.mp4"></video>';
    const urls = collectBlobUrls(html);
    expect(urls).toHaveLength(2);
    expect(urls).toContain("blob:http://localhost/photo.jpg");
    expect(urls).toContain("blob:http://localhost/video.mp4");
  });

  it("不返回真实 http URL（测试 3）", () => {
    const html =
      '<img src="https://cdn.example.com/real.jpg"/><img src="blob:http://localhost/fake.jpg"/>';
    const urls = collectBlobUrls(html);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe("blob:http://localhost/fake.jpg");
  });

  it("空 HTML 返回空数组（测试 4）", () => {
    expect(collectBlobUrls("")).toEqual([]);
    expect(collectBlobUrls("   ")).toEqual([]);
  });

  it("HTML 无媒体元素返回空数组（测试 5）", () => {
    const html = "<p>普通段落没有图片和视频</p><div>另一个 div</div>";
    expect(collectBlobUrls(html)).toEqual([]);
  });

  it("提取 video poster 和 source src 中的 blob URL", () => {
    const html =
      '<video src="blob:http://localhost/video.mp4" poster="blob:http://localhost/thumb.jpg">' +
      '<source src="blob:http://localhost/video.webm"/></video>';
    const urls = collectBlobUrls(html);
    expect(urls).toHaveLength(3);
    expect(urls).toContain("blob:http://localhost/video.mp4");
    expect(urls).toContain("blob:http://localhost/thumb.jpg");
    expect(urls).toContain("blob:http://localhost/video.webm");
  });

  it("自动去重重复的 blob URL", () => {
    const html =
      '<img src="blob:http://localhost/same.jpg"/><img src="blob:http://localhost/same.jpg"/>';
    const urls = collectBlobUrls(html);
    expect(urls).toHaveLength(1);
  });
});

// ============================================================
// uploadMediaBatch
// ============================================================

/** 创建最小 File 模拟对象 */
function makeMockFile(
  name: string,
  type: string,
  size = 1024
): File {
  return new File([new ArrayBuffer(size)], name, { type });
}

describe("uploadMediaBatch", () => {
  it("3 个图片全部上传成功（测试 6）", async () => {
    const fileMap = new Map<string, File>();
    fileMap.set("blob:1", makeMockFile("a.png", "image/png"));
    fileMap.set("blob:2", makeMockFile("b.jpg", "image/jpeg"));
    fileMap.set("blob:3", makeMockFile("c.gif", "image/gif"));

    const uploadImage = vi
      .fn()
      .mockImplementation(async (file: File) => ({
        id: `id_${file.name}`,
        url: `https://cdn.example.com/${file.name}`,
      }));

    const uploadVideo = vi.fn();

    const result = await uploadMediaBatch(fileMap, uploadImage, uploadVideo);

    expect(result.imageIds).toHaveLength(3);
    expect(result.imageIds).toContain("id_a.png");
    expect(result.imageIds).toContain("id_b.jpg");
    expect(result.imageIds).toContain("id_c.gif");
    expect(result.videoIds).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.urlMapping.get("blob:1")).toBe(
      "https://cdn.example.com/a.png"
    );
    expect(result.urlMapping.get("blob:2")).toBe(
      "https://cdn.example.com/b.jpg"
    );
    expect(uploadImage).toHaveBeenCalledTimes(3);
    expect(uploadVideo).not.toHaveBeenCalled();
  });

  it("图片+视频混合上传正确分类（测试 7）", async () => {
    const fileMap = new Map<string, File>();
    fileMap.set("blob:img", makeMockFile("photo.jpg", "image/jpeg"));
    fileMap.set("blob:vid", makeMockFile("clip.mp4", "video/mp4"));

    const uploadImage = vi.fn().mockImplementation(async (file: File) => ({
      id: `img_${file.name}`,
      url: `https://cdn.example.com/${file.name}`,
    }));

    const uploadVideo = vi.fn().mockImplementation(async (file: File) => ({
      id: `vid_${file.name}`,
      url: `https://cdn.example.com/${file.name}`,
    }));

    const result = await uploadMediaBatch(fileMap, uploadImage, uploadVideo);

    expect(result.imageIds).toEqual(["img_photo.jpg"]);
    expect(result.videoIds).toEqual(["vid_clip.mp4"]);
    expect(result.errors).toHaveLength(0);
    expect(result.urlMapping.get("blob:img")).toBe(
      "https://cdn.example.com/photo.jpg"
    );
    expect(result.urlMapping.get("blob:vid")).toBe(
      "https://cdn.example.com/clip.mp4"
    );
  });

  it("1 个文件上传失败，其他正常（测试 8）", async () => {
    const fileMap = new Map<string, File>();
    fileMap.set("blob:ok1", makeMockFile("ok1.jpg", "image/jpeg"));
    fileMap.set("blob:fail", makeMockFile("fail.png", "image/png"));
    fileMap.set("blob:ok2", makeMockFile("ok2.gif", "image/gif"));

    const uploadImage = vi
      .fn()
      .mockImplementation(async (file: File) => {
        if (file.name === "fail.png") {
          throw new Error("网络错误");
        }
        return {
          id: `id_${file.name}`,
          url: `https://cdn.example.com/${file.name}`,
        };
      });

    const uploadVideo = vi.fn();

    const result = await uploadMediaBatch(fileMap, uploadImage, uploadVideo);

    expect(result.imageIds).toHaveLength(2);
    expect(result.imageIds).toContain("id_ok1.jpg");
    expect(result.imageIds).toContain("id_ok2.gif");
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].blobUrl).toBe("blob:fail");
    expect(result.errors[0].message).toContain("网络错误");
    expect(result.urlMapping.get("blob:ok1")).toBe(
      "https://cdn.example.com/ok1.jpg"
    );
    expect(result.urlMapping.has("blob:fail")).toBe(false);
  });

  it("空 Map 返回空结果，不调用上传函数（测试 9）", async () => {
    const uploadImage = vi.fn();
    const uploadVideo = vi.fn();

    const result = await uploadMediaBatch(
      new Map(),
      uploadImage,
      uploadVideo
    );

    expect(result.imageIds).toEqual([]);
    expect(result.videoIds).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.urlMapping.size).toBe(0);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(uploadVideo).not.toHaveBeenCalled();
  });
});

// ============================================================
// replaceBlobUrls
// ============================================================

describe("replaceBlobUrls", () => {
  it("2 个 blob 全部有映射，HTML 中全部替换（测试 10）", () => {
    const html =
      '<p><img src="blob:http://localhost/1.jpg"/></p><p><img src="blob:http://localhost/2.png"/></p>';
    const mapping = new Map<string, string>([
      ["blob:http://localhost/1.jpg", "https://cdn.example.com/uploaded_1.jpg"],
      ["blob:http://localhost/2.png", "https://cdn.example.com/uploaded_2.png"],
    ]);

    const result = replaceBlobUrls(html, mapping);

    expect(result).not.toContain("blob:http://localhost/1.jpg");
    expect(result).not.toContain("blob:http://localhost/2.png");
    expect(result).toContain("https://cdn.example.com/uploaded_1.jpg");
    expect(result).toContain("https://cdn.example.com/uploaded_2.png");
  });

  it("1 个 blob 无映射，该 URL 保留（测试 11）", () => {
    const html =
      '<img src="blob:http://localhost/mapped.jpg"/><img src="blob:http://localhost/unmapped.jpg"/>';
    const mapping = new Map<string, string>([
      ["blob:http://localhost/mapped.jpg", "https://cdn.example.com/uploaded.jpg"],
    ]);

    const result = replaceBlobUrls(html, mapping);

    // 已映射的应被替换
    expect(result).toContain("https://cdn.example.com/uploaded.jpg");
    expect(result).not.toContain("blob:http://localhost/mapped.jpg");
    // 无映射的应保留
    expect(result).toContain("blob:http://localhost/unmapped.jpg");
  });

  it("src 和 poster 属性均被替换（测试 12）", () => {
    const html =
      '<video src="blob:video.mp4" poster="blob:thumb.jpg"></video>';
    const mapping = new Map<string, string>([
      ["blob:video.mp4", "https://cdn.example.com/video.mp4"],
      ["blob:thumb.jpg", "https://cdn.example.com/thumb.jpg"],
    ]);

    const result = replaceBlobUrls(html, mapping);

    expect(result).toContain('src="https://cdn.example.com/video.mp4"');
    expect(result).toContain('poster="https://cdn.example.com/thumb.jpg"');
    expect(result).not.toContain("blob:");
  });

  it("同时替换 img src 和 source src", () => {
    const html =
      '<img src="blob:img.jpg"/><video><source src="blob:source.mp4"/></video>';
    const mapping = new Map<string, string>([
      ["blob:img.jpg", "https://cdn.example.com/img.jpg"],
      ["blob:source.mp4", "https://cdn.example.com/source.mp4"],
    ]);

    const result = replaceBlobUrls(html, mapping);

    expect(result).toContain('src="https://cdn.example.com/img.jpg"');
    expect(result).toContain('src="https://cdn.example.com/source.mp4"');
    expect(result).not.toContain("blob:");
  });
});
