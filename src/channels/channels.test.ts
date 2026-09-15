import { describe, expect, it, vi } from "vitest";
import { createChannels } from "./channels.js";

describe("createChannels", () => {
  it("lists WhatsApp channels", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ id: "waba" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const channels = createChannels({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(channels.list({ platform: "whatsapp" })).resolves.toEqual([
      { id: "waba" },
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("platform=whatsapp");
  });
});
