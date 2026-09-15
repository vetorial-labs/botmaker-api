import {
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type ChannelsOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createChannels(options: ChannelsOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async list(query: { platform?: string; active?: boolean } = {}) {
      const payload = await api.request("GET", "/channels", { query });
      return itemsOf(payload);
    },
    update(id: string, body: { name?: string; active?: boolean }) {
      return api.request("PATCH", `/channels/${encodeURIComponent(id)}`, {
        body,
      });
    },
  };
}

export type ChannelsClient = ReturnType<typeof createChannels>;
