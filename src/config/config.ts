import {
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type ConfigOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createConfig(options: ConfigOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async listVariables() {
      return itemsOf(await api.request("GET", "/variables"), "variables");
    },
    async listConstants() {
      return itemsOf(await api.request("GET", "/constants"));
    },
    getConstant(id: string) {
      return api.request("GET", `/constants/${encodeURIComponent(id)}`);
    },
    updateConstant(id: string, body: unknown) {
      return api.request("PATCH", `/constants/${encodeURIComponent(id)}`, {
        body,
      });
    },
    async listTypifications() {
      return itemsOf(await api.request("GET", "/typifications"));
    },
    getEntity(entityName: string) {
      return api.request("GET", `/entities/${encodeURIComponent(entityName)}`);
    },
    createEntity(entityName: string, body: unknown) {
      return api.request("POST", `/entities/${encodeURIComponent(entityName)}`, {
        body,
      });
    },
    deleteEntity(entityName: string) {
      return api.request(
        "DELETE",
        `/entities/${encodeURIComponent(entityName)}`,
      );
    },
    getKnowledgeBases() {
      return api.request("GET", "/knowledge-bases");
    },
    updateKnowledgeBases(body: unknown) {
      return api.request("PUT", "/knowledge-bases", { body });
    },
    uploadKnowledgeBase(body: unknown) {
      return api.request("POST", "/knowledge-bases", { body });
    },
  };
}

export type ConfigClient = ReturnType<typeof createConfig>;
