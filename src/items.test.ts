import { describe, expect, it } from "vitest";
import { itemsOf } from "./items.js";

describe("itemsOf", () => {
  it("returns empty for null or missing items", () => {
    expect(itemsOf(null)).toEqual([]);
    expect(itemsOf(undefined)).toEqual([]);
    expect(itemsOf({})).toEqual([]);
  });

  it("reads items or a raw array", () => {
    expect(itemsOf({ items: [1, 2] })).toEqual([1, 2]);
    expect(itemsOf([3])).toEqual([3]);
    expect(itemsOf({ items: null })).toEqual([]);
  });
});
