import { describe, expect, it, vi } from "vitest";
import { createWhatsapp } from "./whatsapp.js";

describe("createWhatsapp", () => {
  it("GETs account status", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ connectionStatus: "CONNECTED" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const wa = createWhatsapp({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(wa.getAccountStatus("5511999999999")).resolves.toEqual({
      connectionStatus: "CONNECTED",
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/whatsapp\/accounts\/5511999999999\/status$/,
    );
  });
});
