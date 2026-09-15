import { describe, expect, it, vi } from "vitest";
import { createEcommerce } from "./ecommerce.js";

describe("createEcommerce", () => {
  it("lists catalogs", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ id: "c1" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const ecom = createEcommerce({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(ecom.listCatalogs()).resolves.toEqual([{ id: "c1" }]);
  });
});
