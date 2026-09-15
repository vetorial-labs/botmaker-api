import { describe, expect, it, vi } from "vitest";
import { createAgents } from "./agents.js";

describe("createAgents", () => {
  it("lists roles", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ name: "op" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const agents = createAgents({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(agents.listRoles()).resolves.toEqual([{ name: "op" }]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/roles$/);
  });
});
