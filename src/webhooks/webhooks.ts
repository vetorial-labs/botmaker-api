import {
  createBotmakerClient,
  itemsOf,
  type BotmakerClient,
  type BotmakerClientOptions,
  type components,
} from "../index.js";

export type WebhooksOptions = BotmakerClientOptions & { api?: BotmakerClient };
export type RedirectionRule = components["schemas"]["RedirectionRule"];

export function createWebhooks(options: WebhooksOptions = {}) {
  const api = options.api ?? createBotmakerClient(options);

  return {
    api,
    async list() {
      const payload = await api.request("GET", "/webhooks");
      return itemsOf(payload);
    },
    get(id: string) {
      return api.request("GET", `/webhooks/${encodeURIComponent(id)}`);
    },
    createRedirectionRule(webhookId: string, body: RedirectionRule) {
      return api.request(
        "POST",
        `/webhooks/${encodeURIComponent(webhookId)}/redirection-rules`,
        { body },
      );
    },
    getRedirectionRule(webhookId: string, ruleId: string) {
      return api.request(
        "GET",
        `/webhooks/${encodeURIComponent(webhookId)}/redirection-rules/${encodeURIComponent(ruleId)}`,
      );
    },
    updateRedirectionRule(
      webhookId: string,
      ruleId: string,
      body: RedirectionRule,
    ) {
      return api.request(
        "PATCH",
        `/webhooks/${encodeURIComponent(webhookId)}/redirection-rules/${encodeURIComponent(ruleId)}`,
        { body },
      );
    },
    deleteRedirectionRule(webhookId: string, ruleId: string) {
      return api.request(
        "DELETE",
        `/webhooks/${encodeURIComponent(webhookId)}/redirection-rules/${encodeURIComponent(ruleId)}`,
      );
    },
  };
}

export type WebhooksClient = ReturnType<typeof createWebhooks>;
