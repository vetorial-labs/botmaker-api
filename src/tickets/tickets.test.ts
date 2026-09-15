import { describe, expect, it, vi } from "vitest";
import { createTickets } from "./tickets.js";

describe("createTickets", () => {
  it("GETs a ticket by code", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: "T1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const tickets = createTickets({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(tickets.get("T1")).resolves.toEqual({ code: "T1" });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/tickets\/T1$/);
  });
});
