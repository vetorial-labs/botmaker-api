import {
  collectPages,
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type WhatsappOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createWhatsapp(options: WhatsappOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async listAccounts() {
      return itemsOf(await api.request("GET", "/whatsapp/accounts"));
    },
    getAccount(number: string) {
      return api.request(
        "GET",
        `/whatsapp/accounts/${encodeURIComponent(number)}`,
      );
    },
    getAccountStatus(number: string) {
      return api.request(
        "GET",
        `/whatsapp/accounts/${encodeURIComponent(number)}/status`,
      );
    },
    createAccount(body: unknown) {
      return api.request("POST", "/whatsapp/accounts", { body });
    },
    async listTemplates(query: { state?: string } = {}) {
      let first = true;
      const firstReq = api.request("GET", "/whatsapp/templates", { query });
      return collectPages({
        first: "/whatsapp/templates",
        request: async (_m, url) => {
          if (first) {
            first = false;
            return firstReq;
          }
          return api.request("GET", url);
        },
        sleep: api.sleep,
        sleepMs: 1050,
        maxPages: 20,
      });
    },
    getTemplate(idOrName: string) {
      return api.request(
        "GET",
        `/whatsapp/templates/${encodeURIComponent(idOrName)}`,
      );
    },
    createTemplate(body: unknown) {
      return api.request("POST", "/whatsapp/templates", { body });
    },
    deleteTemplate(idOrName: string) {
      return api.request(
        "DELETE",
        `/whatsapp/templates/${encodeURIComponent(idOrName)}`,
      );
    },
  };
}

export type WhatsappClient = ReturnType<typeof createWhatsapp>;
