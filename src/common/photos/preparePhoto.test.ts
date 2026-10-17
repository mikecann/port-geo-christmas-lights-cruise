import { describe, expect, it } from "vitest";
import { preparePhotoForUpload } from "./preparePhoto";

const photo = (type: string, size = 1000, name = "lights.jpg") =>
  new File([new Uint8Array(size)], name, { type });

describe("preparePhotoForUpload", () => {
  it("uploads the compressed JPEG", async () => {
    const jpeg = photo("image/jpeg", 500);
    expect(
      await preparePhotoForUpload(photo("image/png"), async () => jpeg),
    ).toEqual({ file: jpeg });
  });

  it("refuses to send anything when compression fails", async () => {
    const result = await preparePhotoForUpload(
      photo("image/png", 1000, "house.png"),
      async () => {
        throw new Error("decode failed");
      },
    );
    expect(result).toEqual({
      error:
        "We couldn't read house.png. Please choose a JPEG, PNG or WebP photo.",
    });
  });

  it("refuses a result the server won't accept", async () => {
    const result = await preparePhotoForUpload(
      photo("image/gif"),
      async (file) => file,
    );
    expect(result).toEqual({ error: expect.stringContaining("JPEG") });

    const tooBig = await preparePhotoForUpload(photo("image/png"), async () =>
      photo("image/jpeg", 5 * 1024 * 1024 + 1),
    );
    expect(tooBig).toEqual({ error: expect.stringContaining("over 5 MB") });
  });

  it("doesn't try to shrink originals over 10MB", async () => {
    let compressed = false;
    const result = await preparePhotoForUpload(
      photo("image/jpeg", 10 * 1024 * 1024 + 1),
      async (file) => {
        compressed = true;
        return file;
      },
    );
    expect(result).toEqual({ error: "lights.jpg is larger than 10MB." });
    expect(compressed).toBe(false);
  });
});
