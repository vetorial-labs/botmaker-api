import {
  itemsOf,
  type BotmakerClient,
  type components,
} from "../index.js";

export type SessionResponse = components["schemas"]["SessionResponse"];
export type CustomerDetail = components["schemas"]["CustomerDetail"];
export type NotificationInstanceDetailResponse =
  components["schemas"]["NotificationInstanceDetailResponse"];

/** Nome no console: notification-status-error. Na API v2: notification-error. */
export const NOTIFICATION_ERROR_EVENT_NAMES = [
  "notification-error",
  "notification-status-error",
] as const;

export type NotificationErrorEvent = {
  name: string;
  creationTime?: string;
  sessionId?: string;
  reason?: string;
  error?: string;
  messageId?: string;
  whatsappTemplate?: string;
  webhookPayload?: string;
};

export type CustomerDelivery = CustomerDetail & {
  errors: NotificationErrorEvent[];
};

export type DeliveryReport = {
  notification: NotificationInstanceDetailResponse["notification"];
  totals: {
    sent?: number;
    delivered?: number;
    read?: number;
    answered?: number;
    error?: number;
  };
  customers: CustomerDelivery[];
  sessionsScanned: number;
  sessionPages: number;
  truncated: boolean;
};

export function isNotificationErrorEvent(name?: string | null): boolean {
  return (
    name === "notification-error" || name === "notification-status-error"
  );
}

function sessionChatId(session: SessionResponse): string | undefined {
  const nested = session.chat?.chat?.chatId;
  const flat = (session.chat as { chatId?: string } | undefined)?.chatId;
  return nested ?? flat;
}

function eventPayload(info: unknown): NotificationErrorEvent {
  const rec = (info ?? {}) as {
    reason?: string;
    error?: string;
    messageId?: string;
    whatsappTemplate?: string;
    webhookPayload?: string;
  };
  return {
    name: "notification-error",
    reason: rec.reason ?? rec.error,
    error: rec.error ?? rec.reason,
    messageId: rec.messageId,
    whatsappTemplate: rec.whatsappTemplate,
    webhookPayload: rec.webhookPayload,
  };
}

export function matchSession(
  customer: CustomerDetail,
  session: SessionResponse,
): boolean {
  if (customer.sessionId && session.id === customer.sessionId) {
    return true;
  }
  const chatId = sessionChatId(session);
  if (customer.customerId && chatId === customer.customerId) {
    return true;
  }
  if (
    customer.customerId &&
    session.id?.startsWith(`${customer.customerId}_`)
  ) {
    return true;
  }
  return false;
}

export function errorsForCustomer(
  customer: CustomerDetail,
  sessions: SessionResponse[],
): NotificationErrorEvent[] {
  const out: NotificationErrorEvent[] = [];
  for (const session of sessions) {
    if (!matchSession(customer, session)) {
      continue;
    }
    for (const event of session.events ?? []) {
      if (!isNotificationErrorEvent(event.name)) {
        continue;
      }
      out.push({
        ...eventPayload(event.info),
        name: event.name ?? "notification-error",
        creationTime: event.creationTime,
        sessionId: event.sessionId ?? session.id,
      });
    }
  }
  return out;
}

export type FetchSessionsOptions = {
  from?: string;
  to?: string;
  maxPages?: number;
};

export async function fetchSessionsWithEvents(
  api: BotmakerClient,
  options: FetchSessionsOptions = {},
): Promise<{
  sessions: SessionResponse[];
  pages: number;
  truncated: boolean;
}> {
  const maxPages = options.maxPages ?? 8;
  const sessions: SessionResponse[] = [];
  let url: string | null = "/sessions";
  let page = 0;
  let first = true;

  while (url && page < maxPages) {
    if (page > 0) {
      await api.sleep(200);
    }
    const payload: unknown = first
      ? await api.request("GET", "/sessions", {
          query: {
            from: options.from,
            to: options.to,
            "include-open-sessions": true,
            "include-events": true,
          },
        })
      : await api.request("GET", url);
    first = false;
    page += 1;
    sessions.push(...itemsOf<SessionResponse>(payload));
    const next =
      payload && typeof payload === "object"
        ? (payload as { nextPage?: string | null }).nextPage
        : null;
    url = typeof next === "string" && next.length > 0 ? next : null;
  }

  return { sessions, pages: page, truncated: Boolean(url) };
}

export function windowFromNotification(
  notification: NotificationInstanceDetailResponse["notification"],
): { from: string; to: string } {
  const start = notification?.start
    ? new Date(notification.start)
    : new Date(Date.now() - 6 * 3600 * 1000);
  const end = notification?.end ? new Date(notification.end) : new Date();
  start.setMinutes(start.getMinutes() - 2);
  end.setMinutes(end.getMinutes() + 2);
  return { from: start.toISOString(), to: end.toISOString() };
}
