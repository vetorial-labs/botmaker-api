import {
  createBotmakerClient,
  type BotmakerClient,
  type BotmakerClientOptions,
  type components,
} from "../index.js";

export type AuthOptions = BotmakerClientOptions & { api?: BotmakerClient };
export type RefreshCredentialsRequest =
  components["schemas"]["RefreshCredentialsRequest"];

function resolveApi(options: AuthOptions): BotmakerClient {
  return options.api ?? createBotmakerClient(options);
}

export function createAuth(options: AuthOptions = {}) {
  const api = resolveApi(options);

  return {
    api,
    getCredentials: () => api.request("GET", "/auth/credentials"),
    refreshCredentials: (body: RefreshCredentialsRequest) =>
      api.request("POST", "/auth/credentials", { body }),
    deleteCredentials: () => api.request("DELETE", "/auth/credentials"),
  };
}

export type AuthClient = ReturnType<typeof createAuth>;
