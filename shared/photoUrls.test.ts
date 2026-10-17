import { describe, expect, it } from "vitest";
import { ENTRY_PHOTO, resizedPhotoSrcSet, resizedPhotoUrl } from "./photoUrls";

const source = "https://files.example/photo.jpg";

describe("resized photo URLs", () => {
  it("asks Cloudflare for a fixed width without upscaling or a dpr", () => {
    expect(resizedPhotoUrl(source, 480)).toBe(
      "https://portgeochristmascruise.com.au/cdn-cgi/image/width=480,quality=75,format=auto,fit=scale-down/https://files.example/photo.jpg",
    );
    expect(resizedPhotoUrl(source, 128, 60)).toContain("quality=60");
  });

  it("lists every entry photo width in the srcset", () => {
    const srcSet = resizedPhotoSrcSet(source, ENTRY_PHOTO.widths);
    expect(srcSet.split(", ")).toEqual([
      `${resizedPhotoUrl(source, 480)} 480w`,
      `${resizedPhotoUrl(source, 780)} 780w`,
      `${resizedPhotoUrl(source, 1200)} 1200w`,
    ]);
    expect(srcSet).not.toContain("dpr");
  });
});
