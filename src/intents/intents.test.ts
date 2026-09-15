import { describe, expect, it, vi } from "vitest";
import { createIntents } from "./intents.js";

describe("createIntents", () => {
  it("lists first page of intents", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ name: "x" }], nextPage: null }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const intents = createIntents({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(intents.list()).resolves.toEqual([{ name: "x" }]);
  });
});
