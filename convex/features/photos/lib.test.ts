import { describe, expect, it } from "vitest";
import { hasImageSignature } from "./lib";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

describe("hasImageSignature", () => {
  it("accepts JPEG, PNG and WebP", () => {
    expect(hasImageSignature(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe(
      true,
    );
    expect(
      hasImageSignature(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
    ).toBe(true);
    expect(
      hasImageSignature(
        bytes(...ascii("RIFF"), 0x24, 0x10, 0, 0, ...ascii("WEBP")),
      ),
    ).toBe(true);
  });

  it("refuses other files, whatever they were labelled", () => {
    expect(hasImageSignature(bytes(...ascii("<!doctype html>")))).toBe(false);
    expect(hasImageSignature(bytes(...ascii("GIF89a")))).toBe(false);
    expect(
      hasImageSignature(
        bytes(...ascii("RIFF"), 0x24, 0x10, 0, 0, ...ascii("WAVE")),
      ),
    ).toBe(false);
  });

  it("refuses files too short to hold a signature", () => {
    expect(hasImageSignature(bytes())).toBe(false);
    expect(hasImageSignature(bytes(0xff, 0xd8))).toBe(false);
    expect(hasImageSignature(bytes(0x89, 0x50, 0x4e, 0x47))).toBe(false);
  });
});
