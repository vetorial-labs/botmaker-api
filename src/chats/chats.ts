import {
  chunk,
  collectPages,
  collectPagesWithMeta,
  createBotmakerClient,
  type BotmakerClient,
  type BotmakerClientOptions,
  type components,
} from "../index.js";
import { whatsappContactIdVariants } from "./phone.js";

export const BATCH_TRIGGER_INTENT_MAX = 500;
/** Spec: 60 req/s no batch. ~17ms; 20ms deixa folga. */
export const BATCH_TRIGGER_INTENT_MIN_INTERVAL_MS = 20;
/** Spec: 3 req/s em GET /chats. */
export const LIST_CHATS_MIN_INTERVAL_MS = 350;
/** Spec: 5 req/s em GET /sessions. */
export const LIST_SESSIONS_MIN_INTERVAL_MS = 200;

export type TriggerIntentRequest =
  components["schemas"]["TriggerIntentRequest"];
export type TriggerIntentBatchResponse =
  components["schemas"]["TriggerIntentBatchResponse"];
export type MessagesRequest = components["schemas"]["MessagesRequest"];
export type ChatUpdateRequest = components["schemas"]["ChatUpdateRequest"];
export type ChatWithMessagesResponse =
  components["schemas"]["ChatWithMessagesResponse"];
export type WebhookNotificationIdResponse =
  components["schemas"]["WebhookNotificationIdResponse"];
export type SessionResponse = components["schemas"]["SessionResponse"];
export type SessionEventResponse = components["schemas"]["SessionEventResponse"];

export type ChatsOptions = BotmakerClientOptions & {
  api?: BotmakerClient;
};

export type ListChatsQuery = {
  from?: string;
  to?: string;
  name?: string;
  emails?: string;
  channelId?: string;
  contactId?: string;
  longTermSearch?: boolean;
  onlyUsersNeverTalked?: boolean;
};

export type ListSessionsQuery = {
  from?: string;
  to?: string;
  longTermSearch?: boolean;
  includeOpenSessions?: boolean;
  includeMessages?: boolean;
  includeVariables?: boolean;
  includeEvents?: boolean;
  includeAiAnalysis?: boolean;
  timestampPrecision?: string;
  maxPages?: number;
};

export type ListMessagesQuery = {
  from?: string;
  to?: string;
  chatId?: string;
  channelId?: string;
  contactId?: string;
  limit?: number;
  longTermSearch?: boolean;
};

export type BatchTriggerIntentOptions = {
  chunkSize?: number;
  minIntervalMs?: number;
};

function resolveApi(options: ChatsOptions): BotmakerClient {
  return options.api ?? createBotmakerClient(options);
}

function listChatsQuery(
  query: ListChatsQuery = {},
): Record<string, string | boolean | undefined> {
  return {
    from: query.from,
    to: query.to,
    name: query.name,
    emails: query.emails,
    "channel-id": query.channelId,
    "contact-id": query.contactId,
    "long-term-search": query.longTermSearch,
    "only-users-never-talked": query.onlyUsersNeverTalked,
  };
}

export function createChats(options: ChatsOptions = {}) {
  const api = resolveApi(options);

  async function triggerIntent(body: TriggerIntentRequest) {
    return api.request<WebhookNotificationIdResponse>(
      "POST",
      "/chats-actions/trigger-intent",
      { body },
    );
  }

  async function batchTriggerIntent(
    items: TriggerIntentRequest[],
    batchOptions: BatchTriggerIntentOptions = {},
  ): Promise<TriggerIntentBatchResponse["items"]> {
    const size = batchOptions.chunkSize ?? BATCH_TRIGGER_INTENT_MAX;
    if (size > BATCH_TRIGGER_INTENT_MAX) {
      throw new Error(
        `chunkSize maximo da API e ${BATCH_TRIGGER_INTENT_MAX}`,
      );
    }
    const minIntervalMs =
      batchOptions.minIntervalMs ?? BATCH_TRIGGER_INTENT_MIN_INTERVAL_MS;
    const groups = chunk(items, size);
    const collected: NonNullable<TriggerIntentBatchResponse["items"]> = [];

    for (let i = 0; i < groups.length; i += 1) {
      if (i > 0 && minIntervalMs > 0) {
        await api.sleep(minIntervalMs);
      }
      const page = await api.request<TriggerIntentBatchResponse>(
        "POST",
        "/chats-actions/batch/trigger-intent",
        { body: { items: groups[i] } },
      );
      collected.push(...(page?.items ?? []));
    }

    return collected;
  }

  async function sendMessages(body: MessagesRequest) {
    return api.request<WebhookNotificationIdResponse>(
      "POST",
      "/chats-actions/send-messages",
      { body },
    );
  }

  async function getChat(chatReference: string) {
    const encoded = encodeURIComponent(chatReference);
    return api.request<ChatWithMessagesResponse>(
      "GET",
      `/chats/${encoded}`,
    );
  }

  async function updateChat(
    chatReference: string,
    body: ChatUpdateRequest,
  ) {
    const encoded = encodeURIComponent(chatReference);
    return api.request("PATCH", `/chats/${encoded}`, { body });
  }

  async function listChats(query: ListChatsQuery = {}) {
    const first = "/chats";
    const withQuery = api.request("GET", first, {
      query: listChatsQuery(query),
    });
    // collectPages precisa da primeira URL ja com query. Montamos via request
    // custom: primeira chamada usa query; nextPage e absoluta.
    let firstCall = true;
    return collectPages<Record<string, unknown>>({
      first,
      request: async (_method, url) => {
        if (firstCall) {
          firstCall = false;
          return withQuery;
        }
        return api.request("GET", url);
      },
      sleepMs: LIST_CHATS_MIN_INTERVAL_MS,
      sleep: api.sleep,
    });
  }

  async function listSessions(query: ListSessionsQuery = {}) {
    const first = "/sessions";
    let firstCall = true;
    const firstRequest = api.request("GET", first, {
      query: {
        from: query.from,
        to: query.to,
        "long-term-search": query.longTermSearch,
        "include-open-sessions": query.includeOpenSessions,
        "include-messages": query.includeMessages,
        "include-variables": query.includeVariables,
        "include-events": query.includeEvents,
        "include-ai-analysis": query.includeAiAnalysis,
        "timestamp-precision": query.timestampPrecision,
      },
    });
    return collectPagesWithMeta<SessionResponse>({
      first,
      request: async (_method, url) => {
        if (firstCall) {
          firstCall = false;
          return firstRequest;
        }
        return api.request("GET", url);
      },
      sleepMs: LIST_SESSIONS_MIN_INTERVAL_MS,
      sleep: api.sleep,
      maxPages:
        query.maxPages ??
        (query.includeEvents || query.includeMessages ? 10 : 20),
    });
  }

  async function listMessages(query: ListMessagesQuery = {}) {
    return api.request("GET", "/messages", {
      query: {
        from: query.from,
        to: query.to,
        "chat-id": query.chatId,
        "channel-id": query.channelId,
        "contact-id": query.contactId,
        limit: query.limit,
        "long-term-search": query.longTermSearch,
      },
    });
  }

  async function listChatVariables() {
    return api.request("GET", "/chats/variables");
  }

  async function sendTyping(body: Record<string, unknown>) {
    return api.request("POST", "/chats-actions/send-read-typing-feedback", {
      body,
    });
  }

  async function sendReaction(body: Record<string, unknown>) {
    return api.request("POST", "/chats-actions/send-reaction", { body });
  }

  async function deleteReaction(body: Record<string, unknown>) {
    return api.request("DELETE", "/chats-actions/send-reaction", { body });
  }

  async function startCall(body: Record<string, unknown>) {
    return api.request("POST", "/chats-actions/start-call", { body });
  }

  async function resolveChat(options: {
    channelId: string;
    phone: string;
  }): Promise<ChatWithMessagesResponse[]> {
    const byId = new Map<string, ChatWithMessagesResponse>();
    for (const contactId of whatsappContactIdVariants(options.phone)) {
      const rows = await listChats({
        channelId: options.channelId,
        contactId,
      });
      for (const row of rows) {
        const rec = row as ChatWithMessagesResponse;
        const id = rec.chat?.chatId;
        if (id) {
          byId.set(id, rec);
        }
      }
    }
    return [...byId.values()];
  }

  return {
    api,
    triggerIntent,
    batchTriggerIntent,
    sendMessages,
    sendTyping,
    sendReaction,
    deleteReaction,
    startCall,
    getChat,
    updateChat,
    listChats,
    listChatVariables,
    listSessions,
    listMessages,
    resolveChat,
  };
}

export type ChatsClient = ReturnType<typeof createChats>;
