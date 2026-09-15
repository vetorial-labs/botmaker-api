import { describe, expect, it, vi } from "vitest";
import { createBotmakerClient } from "./client.js";
import { collectPages, collectPagesWithMeta } from "./pagination.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("collectPages", () => {
  it("follows nextPage until it is empty", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/chats")) {
        return jsonResponse(200, {
          items: [{ id: "a" }],
          nextPage: "https://api.botmaker.com/v2.0/chats?page=2",
        });
      }
      return jsonResponse(200, {
        items: [{ id: "b" }],
        nextPage: null,
      });
    });

    const api = createBotmakerClient({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const items = await collectPages<{ id: string }>({
      first: "/chats",
      request: (method, url) => api.request(method, url),
      sleepMs: 10,
      sleep: async () => undefined,
    });

    expect(items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reads a custom items key (blacklist contacts)", async () => {
    const api = createBotmakerClient({
      accessToken: "t",
      fetch: (async () =>
        jsonResponse(200, {
          contacts: ["5511"],
          nextPage: "",
        })) as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const contacts = await collectPages<string>({
      first: "/notifications/contacts-blacklist",
      request: (method, url) => api.request(method, url),
      itemsKey: "contacts",
    });

    expect(contacts).toEqual(["5511"]);
  });

  it("stops after maxPages", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/chats")) {
        return jsonResponse(200, {
          items: [{ id: "a" }],
          nextPage: "https://api.botmaker.com/v2.0/chats?page=2",
        });
      }
      return jsonResponse(200, {
        items: [{ id: "b" }],
        nextPage: "https://api.botmaker.com/v2.0/chats?page=3",
      });
    });
    const api = createBotmakerClient({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    const items = await collectPages({
      first: "/chats",
      request: (method, url) => api.request(method, url),
      maxPages: 1,
    });
    expect(items).toEqual([{ id: "a" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const meta = await collectPagesWithMeta({
      first: "/chats",
      request: (method, url) => api.request(method, url),
      maxPages: 1,
    });
    expect(meta.truncated).toBe(true);
    expect(meta.items).toEqual([{ id: "a" }]);
  });
});


