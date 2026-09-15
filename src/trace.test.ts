import { describe, expect, it, vi } from "vitest";
import { createBotmakerClient } from "./client.js";
import { resolveLogLevel } from "./trace.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("resolveLogLevel", () => {
  it("reads options and env", () => {
    expect(resolveLogLevel({})).toBe("off");
    expect(resolveLogLevel({ debug: true })).toBe("debug");
    expect(resolveLogLevel({ trace: true })).toBe("trace");
    expect(resolveLogLevel({ debug: "trace" })).toBe("trace");
  });
});

describe("traced fetch", () => {
  it("debug logs method, url and status without the token", async () => {
    const lines: string[] = [];
    const fetchMock = vi.fn(async () => jsonResponse(200, { ok: true }));
    const api = createBotmakerClient({
      accessToken: "super-secret-token-value",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
      debug: true,
      logger: (line) => lines.push(line),
    });
    await api.request("GET", "/channels");
    const joined = lines.join("\n");
    expect(joined).toMatch(/--> GET /);
    expect(joined).toMatch(/<-- 200 GET /);
    expect(joined).not.toContain("super-secret-token-value");
    expect(joined).not.toMatch(/body /);
  });

  it("trace logs redacted headers and JSON body", async () => {
    const lines: string[] = [];
    const fetchMock = vi.fn(async () => jsonResponse(200, { items: [1] }));
    const api = createBotmakerClient({
      accessToken: "super-secret-token-value",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
      trace: true,
      logger: (line) => lines.push(line),
    });
    await api.request("POST", "/chats-actions/trigger-intent", {
      body: { intentIdOrName: "welcome" },
    });
    const joined = lines.join("\n");
    expect(joined).toContain("access-token");
    expect(joined).toContain("len=24");
    expect(joined).not.toContain("super-secret-token-value");
    expect(joined).toContain("welcome");
    expect(joined).toContain('"items":[1]');
  });
});
