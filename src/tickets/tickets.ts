import {
  collectPages,
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type TicketsOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createTickets(options: TicketsOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async list(query: Record<string, string | number | boolean | undefined> = {}) {
      let first = true;
      const firstReq = api.request("GET", "/tickets", { query });
      return collectPages({
        first: "/tickets",
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
    get(ticketCode: string) {
      return api.request("GET", `/tickets/${encodeURIComponent(ticketCode)}`);
    },
    create(body: unknown) {
      return api.request("POST", "/tickets", { body });
    },
    update(ticketCode: string, body: unknown) {
      return api.request("PUT", `/tickets/${encodeURIComponent(ticketCode)}`, {
        body,
      });
    },
    async fieldDefinitions() {
      return itemsOf(await api.request("GET", "/tickets/field-definitions"));
    },
  };
}

export type TicketsClient = ReturnType<typeof createTickets>;
