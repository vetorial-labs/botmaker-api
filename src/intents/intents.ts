import {
  collectPages,
  createBotmakerClient,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type IntentsOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createIntents(options: IntentsOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async list() {
      let first = true;
      const firstReq = api.request("GET", "/intents");
      return collectPages({
        first: "/intents",
        request: async (_m, url) => {
          if (first) {
            first = false;
            return firstReq;
          }
          return api.request("GET", url);
        },
        sleep: api.sleep,
        sleepMs: 1050,
        maxPages: 50,
      });
    },
    get(idOrName: string) {
      return api.request("GET", `/intents/${encodeURIComponent(idOrName)}`);
    },
  };
}

export type IntentsClient = ReturnType<typeof createIntents>;
