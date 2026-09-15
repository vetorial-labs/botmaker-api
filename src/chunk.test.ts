import { describe, expect, it } from "vitest";
import { chunk } from "./chunk.js";

describe("chunk", () => {
  it("splits items into groups of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns a single chunk when size covers the list", () => {
    expect(chunk(["a", "b"], 500)).toEqual([["a", "b"]]);
  });

  it("returns an empty list for empty input", () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it("rejects a non-positive size", () => {
    expect(() => chunk([1], 0)).toThrow(/chunk size/);
  });
});
