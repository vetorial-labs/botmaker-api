import {
  collectPages,
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
} from "../index.js";

export type AgentsOptions = BotmakerClientOptions & { api?: BotmakerClient };

export function createAgents(options: AgentsOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async listAgents() {
      let first = true;
      const firstReq = api.request("GET", "/agents");
      return collectPages({
        first: "/agents",
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
    createAgent(body: unknown) {
      return api.request("POST", "/agents", { body });
    },
    updateAgent(idOrEmail: string, body: unknown) {
      return api.request(
        "PATCH",
        `/agents/${encodeURIComponent(idOrEmail)}`,
        { body },
      );
    },
    removeAgent(id: string) {
      return api.request("DELETE", `/agents/${encodeURIComponent(id)}`);
    },
    logoutAgent(id: string) {
      return api.request(
        "POST",
        `/agents/${encodeURIComponent(id)}/actions/logout`,
      );
    },
    async listRoles() {
      return itemsOf(await api.request("GET", "/roles"));
    },
    getRole(idOrName: string) {
      return api.request("GET", `/roles/${encodeURIComponent(idOrName)}`);
    },
    createRole(body: unknown) {
      return api.request("POST", "/roles", { body });
    },
    updateRole(idOrName: string, body: unknown) {
      return api.request("PATCH", `/roles/${encodeURIComponent(idOrName)}`, {
        body,
      });
    },
  };
}

export type AgentsClient = ReturnType<typeof createAgents>;
