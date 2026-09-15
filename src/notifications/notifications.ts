import {
  chunk,
  collectPages,
  createBotmakerClient,
  type BotmakerClient,
  type BotmakerClientOptions,
  type components,
} from "../index.js";
import {
  errorsForCustomer,
  fetchSessionsWithEvents,
  windowFromNotification,
  type CustomerDelivery,
  type DeliveryReport,
} from "./delivery.js";

export const BLACKLIST_ADD_MAX = 1000;
/** Spec: 30 req/s na blacklist. */
export const BLACKLIST_MIN_INTERVAL_MS = 40;
/** Spec: 5 req/s em campanhas e POST /notifications. */
export const NOTIFICATIONS_MIN_INTERVAL_MS = 200;
/** Spec: 3 req/min no detalhe de sent-results (custa BI). */
export const SENT_RESULT_DETAIL_MIN_INTERVAL_MS = 20_000;

export type CampaignRequest = components["schemas"]["CampaignRequest"];
export type CampaignResponse = components["schemas"]["CampaignResponse"];
export type NotificationRequest = components["schemas"]["NotificationRequest"];
export type NotificationInstanceResponse =
  components["schemas"]["NotificationInstanceResponse"];
export type NotificationInstanceDetailResponse =
  components["schemas"]["NotificationInstanceDetailResponse"];
export type CustomerDetail = components["schemas"]["CustomerDetail"];

export type NotificationsOptions = BotmakerClientOptions & {
  api?: BotmakerClient;
};

export type ListSentResultsQuery = {
  notificationName?: string;
  from?: string;
  to?: string;
};

function resolveApi(options: NotificationsOptions): BotmakerClient {
  return options.api ?? createBotmakerClient(options);
}

export function createNotifications(options: NotificationsOptions = {}) {
  const api = resolveApi(options);

  async function listCampaigns() {
    return collectPages<CampaignResponse>({
      first: "/notifications/campaigns",
      request: (method, url) => api.request(method, url),
      sleepMs: NOTIFICATIONS_MIN_INTERVAL_MS,
      sleep: api.sleep,
    });
  }

  async function createCampaign(body: CampaignRequest) {
    return api.request<CampaignResponse | null>(
      "POST",
      "/notifications/campaigns",
      { body },
    );
  }

  async function sendNotification(body: NotificationRequest) {
    return api.request("POST", "/notifications", { body });
  }

  async function listBlacklist() {
    return collectPages<string>({
      first: "/notifications/contacts-blacklist",
      request: (method, url) => api.request(method, url),
      itemsKey: "contacts",
      sleepMs: BLACKLIST_MIN_INTERVAL_MS,
      sleep: api.sleep,
    });
  }

  async function addToBlacklist(contacts: string[]) {
    const groups = chunk(contacts, BLACKLIST_ADD_MAX);
    for (let i = 0; i < groups.length; i += 1) {
      if (i > 0) {
        await api.sleep(BLACKLIST_MIN_INTERVAL_MS);
      }
      await api.request("POST", "/notifications/contacts-blacklist", {
        body: { contacts: groups[i] },
      });
    }
  }

  async function removeFromBlacklist(contact: string) {
    const encoded = encodeURIComponent(contact);
    return api.request(
      "DELETE",
      `/notifications/contacts-blacklist/${encoded}`,
    );
  }

  async function listSentResults(query: ListSentResultsQuery = {}) {
    let firstCall = true;
    const firstRequest = api.request("GET", "/notifications/sent-results", {
      query: {
        "notification-name": query.notificationName,
        from: query.from,
        to: query.to,
      },
    });
    return collectPages<NotificationInstanceResponse>({
      first: "/notifications/sent-results",
      request: async (_method, url) => {
        if (firstCall) {
          firstCall = false;
          return firstRequest;
        }
        return api.request("GET", url);
      },
      sleepMs: BLACKLIST_MIN_INTERVAL_MS,
      sleep: api.sleep,
    });
  }

  async function getSentResult(notificationInstanceId: string) {
    let url: string | null = `/notifications/sent-results/${encodeURIComponent(notificationInstanceId)}`;
    let notification: NotificationInstanceDetailResponse["notification"];
    const customers: CustomerDetail[] = [];
    let page = 0;

    while (url) {
      if (page > 0) {
        await api.sleep(SENT_RESULT_DETAIL_MIN_INTERVAL_MS);
      }
      const payload: NotificationInstanceDetailResponse =
        (await api.request(
          "GET",
          url,
        )) as NotificationInstanceDetailResponse;
      if (page === 0) {
        notification = payload.notification;
      }
      customers.push(...(payload.customers ?? []));
      const next: string | undefined = payload.nextPage;
      url = typeof next === "string" && next.length > 0 ? next : null;
      page += 1;
    }

    return { notification, customers };
  }

  async function explainDelivery(options: {
    notificationName?: string;
    instanceId?: string;
    from?: string;
    to?: string;
    maxSessionPages?: number;
  }): Promise<DeliveryReport> {
    let instanceId = options.instanceId;
    if (!instanceId) {
      if (!options.notificationName) {
        throw new Error(
          "Informe instanceId ou notificationName para explainDelivery",
        );
      }
      const listed = await listSentResults({
        notificationName: options.notificationName,
      });
      instanceId = listed[0]?.notificationInstanceId ?? options.notificationName;
    }

    const detail = await getSentResult(instanceId);
    const window = windowFromNotification(detail.notification);
    const { sessions, pages, truncated } = await fetchSessionsWithEvents(api, {
      from: options.from ?? window.from,
      to: options.to ?? window.to,
      maxPages: options.maxSessionPages,
    });

    const customers: CustomerDelivery[] = (detail.customers ?? []).map(
      (customer) => ({
        ...customer,
        errors: errorsForCustomer(customer, sessions),
      }),
    );

    return {
      notification: detail.notification,
      totals: detail.notification?.details ?? {},
      customers,
      sessionsScanned: sessions.length,
      sessionPages: pages,
      truncated,
    };
  }

  return {
    api,
    listCampaigns,
    createCampaign,
    sendNotification,
    listBlacklist,
    addToBlacklist,
    removeFromBlacklist,
    listSentResults,
    getSentResult,
    explainDelivery,
  };
}

export type NotificationsClient = ReturnType<typeof createNotifications>;
