import { describe, expect, it, vi } from "vitest";
import { createNotifications } from "./notifications.js";

function jsonResponse(status: number, body: unknown): Response {
  if (status === 204 || body === null) {
    return new Response(null, { status });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createNotifications", () => {
  it("chunks blacklist adds at 1000 contacts", async () => {
    const bodies: unknown[] = [];
    const fetchMock = vi.fn(async (_input, init) => {
      if (init?.body) {
        bodies.push(JSON.parse(String(init.body)));
      }
      return jsonResponse(204, null);
    });

    const notifications = createNotifications({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const contacts = Array.from({ length: 1001 }, (_, i) => `5511${i}`);
    await notifications.addToBlacklist(contacts);

    expect(bodies).toHaveLength(2);
    expect((bodies[0] as { contacts: string[] }).contacts).toHaveLength(1000);
    expect((bodies[1] as { contacts: string[] }).contacts).toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/notifications\/contacts-blacklist$/,
    );
  });

  it("POSTs sendNotification to /notifications", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(201, null));
    const notifications = createNotifications({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    await notifications.sendNotification({
      channelId: "waba",
      name: "d2-lote",
      intentIdOrName: "welcome",
      contacts: [{ contactId: "5511999999999" }],
    });

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/notifications$/);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      name: "d2-lote",
      channelId: "waba",
    });
  });

  it("paginates getSentResult customers across nextPage", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes("page=2")) {
        return jsonResponse(200, {
          customers: [{ customerId: "b" }],
          nextPage: null,
        });
      }
      return jsonResponse(200, {
        notification: { name: "Welcome" },
        customers: [{ customerId: "a" }],
        nextPage: "https://api.botmaker.com/v2.0/notifications/sent-results/n1?page=2",
      });
    });

    const notifications = createNotifications({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const result = await notifications.getSentResult("n1");
    expect(result.notification).toEqual({ name: "Welcome" });
    expect(result.customers).toEqual([
      { customerId: "a" },
      { customerId: "b" },
    ]);
  });

  it("explainDelivery joins sent-results with notification-error reason", async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = String(input);
      if (url.includes("/notifications/sent-results?") || url.endsWith("/notifications/sent-results")) {
        return jsonResponse(200, {
          items: [
            {
              notificationInstanceId: "INST1",
              notificationName: "lote",
              status: "COMPLETED",
              details: { sent: 1, delivered: 0, error: 1 },
              start: "2026-09-14T14:05:00Z",
              end: "2026-09-14T14:06:00Z",
            },
          ],
          nextPage: null,
        });
      }
      if (url.includes("/notifications/sent-results/INST1")) {
        return jsonResponse(200, {
          notification: {
            notificationName: "lote",
            notificationInstanceId: "INST1",
            status: "COMPLETED",
            start: "2026-09-14T14:05:00Z",
            end: "2026-09-14T14:06:00Z",
            details: { sent: 1, delivered: 0, error: 1 },
          },
          customers: [
            {
              customerId: "CHAT1",
              sessionId: "CHAT1_2026-09-14T14:05:00.000Z",
              contactId: "5511999999999",
              lastStatus: "error",
              status: { sent: "2026-09-14T14:05:32Z", error: "2026-09-14T14:05:40Z" },
            },
          ],
          nextPage: null,
        });
      }
      if (url.includes("/sessions")) {
        return jsonResponse(200, {
          items: [
            {
              id: "CHAT1_2026-09-14T14:05:00.000Z",
              chat: { chat: { chatId: "CHAT1" } },
              events: [
                {
                  name: "notification-error",
                  creationTime: "2026-09-14T14:05:40Z",
                  info: {
                    reason:
                      "ReceivedFailedStatus: This message was not delivered to maintain healthy ecosystem engagement. (131049.0)",
                    error:
                      "ReceivedFailedStatus: This message was not delivered to maintain healthy ecosystem engagement. (131049.0)",
                    messageId: "MSG1",
                  },
                },
              ],
            },
          ],
          nextPage: null,
        });
      }
      return jsonResponse(404, { errors: [] });
    });

    const notifications = createNotifications({
      accessToken: "t",
      fetch: fetchMock as unknown as typeof fetch,
      sleep: async () => undefined,
    });

    const report = await notifications.explainDelivery({
      notificationName: "lote",
    });

    expect(report.totals).toEqual({ sent: 1, delivered: 0, error: 1 });
    expect(report.customers).toHaveLength(1);
    expect(report.customers[0]?.lastStatus).toBe("error");
    expect(report.customers[0]?.errors[0]?.reason).toMatch(/131049/);
  });
});
