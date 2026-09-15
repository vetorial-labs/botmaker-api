import { describe, expect, it, vi } from "vitest";
import { createWebhooks } from "./webhooks.js";

describe("createWebhooks", () => {
  it("returns [] when GET /webhooks body is JSON null", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("null", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const webhooks = createWebhooks({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(webhooks.list()).resolves.toEqual([]);
  });
});
