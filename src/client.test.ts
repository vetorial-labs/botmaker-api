import { afterEach, describe, expect, it, vi } from "vitest";
import { createBotmakerClient } from "./client.js";
import { BotmakerApiError } from "./errors.js";

function jsonResponse(status: number, body: unknown): Response {
  if (status === 204 || body === null) {
    return new Response(null, { status });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createBotmakerClient", () => {
  it("throws when the access token is missing", () => {
    vi.stubEnv("BOTMAKER_ACCESS_TOKEN", "");
    expect(() => createBotmakerClient({ fetch: vi.fn() })).toThrow(
      /BOTMAKER_ACCESS_TOKEN/,
    );
  });

  it("sends the access-token header", async () => {
    const fetchMock = vi.fn(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("access-token")).toBe("secret-token");
      return jsonResponse(200, { ok: true });
    });

    const api = createBotmakerClient({
      accessToken: "secret-token",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(api.request("GET", "/channels")).resolves.toEqual({
      ok: true,
    });
  });

  it("retries HTTP 429 and then returns JSON", async () => {
    let attempts = 0;
    const fetchMock = vi.fn(async () => {
      attempts += 1;
      if (attempts < 3) {
        return jsonResponse(429, { errors: [] });
      }
      return jsonResponse(200, { items: [] });
    });
    const sleeps: number[] = [];

    const api = createBotmakerClient({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
    });

    await expect(api.request("GET", "/intents")).resolves.toEqual({
      items: [],
    });
    expect(attempts).toBe(3);
    expect(sleeps.length).toBe(2);
  });

  it("throws BotmakerApiError on a non-429 failure", async () => {
    const api = createBotmakerClient({
      accessToken: "t",
      fetch: (async () =>
        jsonResponse(400, {
          errors: [{ message: "bad" }],
        })) as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const error = await api
      .request("POST", "/chats-actions/trigger-intent", { body: {} })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(BotmakerApiError);
    expect(error).toMatchObject({ status: 400 });
  });

  it("returns null for an empty 204 body", async () => {
    const api = createBotmakerClient({
      accessToken: "t",
      fetch: (async () => jsonResponse(204, null)) as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    await expect(api.request("DELETE", "/x")).resolves.toBeNull();
  });
});
