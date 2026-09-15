import { describe, expect, it, vi } from "vitest";
import { createConfig } from "./config.js";

describe("createConfig", () => {
  it("lists variables from the variables key", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ variables: [{ name: "foo" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const config = createConfig({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(config.listVariables()).resolves.toEqual([{ name: "foo" }]);
  });
});
