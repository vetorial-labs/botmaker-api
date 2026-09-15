import { describe, expect, it } from "vitest";
import {
  errorsForCustomer,
  isNotificationErrorEvent,
  matchSession,
} from "./delivery.js";
import type { CustomerDetail } from "./delivery.js";
import type { SessionResponse } from "./delivery.js";

describe("notification error events", () => {
  it("treats console and API event names as errors", () => {
    expect(isNotificationErrorEvent("notification-error")).toBe(true);
    expect(isNotificationErrorEvent("notification-status-error")).toBe(true);
    expect(isNotificationErrorEvent("notification-sent")).toBe(false);
  });

  it("joins a customer to session events by sessionId", () => {
    const customer: CustomerDetail = {
      customerId: "CHAT1",
      sessionId: "CHAT1_t",
      lastStatus: "error",
    };
    const sessions: SessionResponse[] = [
      {
        id: "CHAT1_t",
        events: [
          {
            name: "notification-error",
            creationTime: "2026-09-14T14:05:40Z",
            info: {
              reason: "ReceivedFailedStatus: (131049.0)",
              error: "ReceivedFailedStatus: (131049.0)",
            },
          },
        ],
      },
    ];
    const errors = errorsForCustomer(customer, sessions);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toContain("131049");
  });

  it("matches flattened chat.chatId from live payloads", () => {
    const customer: CustomerDetail = { customerId: "CHAT1" };
    const session = {
      id: "other",
      chat: { chatId: "CHAT1" },
    } as SessionResponse;
    expect(matchSession(customer, session)).toBe(true);
  });
});
