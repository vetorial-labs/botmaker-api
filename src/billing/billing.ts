import {
  collectPages,
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type BillingOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createBilling(options: BillingOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    getConsumptions(query: { "billing-period"?: string } = {}) {
      return api.request("GET", "/billing/consumptions", { query });
    },
    getBilledConversations(
      query: Record<string, string | number | boolean | undefined> = {},
    ) {
      return api.request("GET", "/billing/whatsapp/billed-conversations", {
        query,
      });
    },
    agentPerformance(query: Record<string, string | undefined> = {}) {
      return api.request("GET", "/dashboards/agent-performance", { query });
    },
    agentMetrics(query: Record<string, string | undefined> = {}) {
      return api.request("GET", "/dashboards/agent-metrics", { query });
    },
    listAudits(auditSection: string, query: Record<string, string | undefined> = {}) {
      return api.request(
        "GET",
        `/audits/${encodeURIComponent(auditSection)}`,
        { query },
      );
    },
    async listContacts(query: Record<string, string | undefined> = {}) {
      let first = true;
      const firstReq = api.request("GET", "/contacts", { query });
      return collectPages({
        first: "/contacts",
        request: async (_m, url) => {
          if (first) {
            first = false;
            return firstReq;
          }
          return api.request("GET", url);
        },
        sleep: api.sleep,
        sleepMs: 350,
        maxPages: 20,
      });
    },
    async listCalls(query: Record<string, string | undefined> = {}) {
      return itemsOf(await api.request("GET", "/calls", { query }));
    },
    privateMediaTempLink(query: { url?: string } = {}) {
      return api.request("GET", "/private-media/temp-access-link", { query });
    },
  };
}

export type BillingClient = ReturnType<typeof createBilling>;
