import { describe, expect, it, vi } from "vitest";
import { createChats } from "./chats.js";
import type { TriggerIntentRequest } from "./chats.js";

function jsonResponse(status: number, body: unknown): Response {
  const text = body === null ? "" : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: { "content-type": "application/json" },
  });
}

function item(n: number): TriggerIntentRequest {
  return {
    chat: { channelId: "waba", contactId: `5511${String(n).padStart(8, "0")}` },
    intentIdOrName: "welcome",
  };
}

describe("createChats", () => {
  it("splits batchTriggerIntent into chunks of 500", async () => {
    const bodies: unknown[] = [];
    const fetchMock = vi.fn(async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return jsonResponse(202, {
        items: [{ webhookNotificationId: "ok" }],
      });
    });

    const chats = createChats({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const items = Array.from({ length: 501 }, (_, i) => item(i));
    const result = await chats.batchTriggerIntent(items);

    expect(bodies).toHaveLength(2);
    expect((bodies[0] as { items: unknown[] }).items).toHaveLength(500);
    expect((bodies[1] as { items: unknown[] }).items).toHaveLength(1);
    expect(result).toHaveLength(2);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/chats-actions\/batch\/trigger-intent$/,
    );
  });

  it("POSTs trigger-intent for a single chat", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(202, { webhookNotificationId: "abc" }),
    );
    const chats = createChats({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    await expect(chats.triggerIntent(item(1))).resolves.toEqual({
      webhookNotificationId: "abc",
    });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/chats-actions\/trigger-intent$/,
    );
  });

  it("encodes chatReference on getChat", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { chat: { chatId: "X" } }),
    );
    const chats = createChats({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    await chats.getChat("waba:5511999999999");
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/chats/waba%3A5511999999999",
    );
  });

  it("maps listChats filters to hyphenated query params", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { items: [{ chatId: "1" }], nextPage: null }),
    );
    const chats = createChats({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const rows = await chats.listChats({
      channelId: "waba",
      contactId: "5511",
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("channel-id=waba");
    expect(url).toContain("contact-id=5511");
    expect(rows).toEqual([{ chatId: "1" }]);
  });

  it("lists sessions with include-events", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        items: [{ id: "CHAT_1", events: [{ name: "notification-error" }] }],
        nextPage: null,
      }),
    );
    const chats = createChats({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const rows = await chats.listSessions({
      from: "2026-09-14T13:00:00Z",
      includeEvents: true,
      includeOpenSessions: true,
    });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/sessions");
    expect(url).toContain("include-events=true");
    expect(url).toContain("include-open-sessions=true");
    expect(rows.items).toHaveLength(1);
    expect(rows.truncated).toBe(false);
    expect(rows.items[0]?.events?.[0]?.name).toBe("notification-error");
  });

  it("resolveChat dedupes BR phone variants onto one chatId", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input);
      const contact = new URL(url).searchParams.get("contact-id");
      return jsonResponse(200, {
        items: [
          {
            chat: {
              chatId: "U1G",
              contactId: "551199887766",
              channelId: "waba",
            },
            queried: contact,
          },
        ],
        nextPage: null,
      });
    });
    const chats = createChats({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });
    const found = await chats.resolveChat({
      channelId: "waba",
      phone: "+5511999887766",
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.chat?.chatId).toBe("U1G");
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });
});
