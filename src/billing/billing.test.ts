import { describe, expect, it, vi } from "vitest";
import { createBilling } from "./billing.js";

describe("createBilling", () => {
  it("GETs consumptions", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ billingPeriod: "2026-09" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const billing = createBilling({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(billing.getConsumptions()).resolves.toEqual({
      billingPeriod: "2026-09",
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/billing\/consumptions$/,
    );
  });
});
