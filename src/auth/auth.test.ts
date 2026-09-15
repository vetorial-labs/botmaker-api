import { describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth.js";

describe("createAuth", () => {
  it("GETs /auth/credentials", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ clientId: "x" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const auth = createAuth({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(auth.getCredentials()).resolves.toEqual({ clientId: "x" });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/auth\/credentials$/);
  });
});
