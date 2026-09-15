import createOpenApiClient from "openapi-fetch";
import { BotmakerApiError } from "./errors.js";
import type { paths } from "./generated/schema.js";
import { createRetryFetch, defaultSleep, type SleepFn } from "./retry.js";
import {
  createTracedFetch,
  resolveLogLevel,
  type BotmakerLogLevel,
  type BotmakerLogger,
} from "./trace.js";
import { resolveBaseUrl, resolveUrl, withQuery } from "./url.js";

export const USER_AGENT = "botmaker-api/0.1.0 (unofficial)";

export type QueryValue = string | number | boolean | undefined | null;

export type BotmakerClientOptions = {
  accessToken?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  maxRetries?: number;
  sleep?: SleepFn;
  /** `true`/`"debug"`: metodo+URL+status. `"trace"`: + headers (token redigido) e body. */
  debug?: boolean | BotmakerLogLevel;
  /** Atalho para debug: "trace". Tambem: env BOTMAKER_TRACE=1 */
  trace?: boolean;
  logger?: BotmakerLogger;
};

export type RequestOptions = {
  body?: unknown;
  query?: Record<string, QueryValue>;
};

function resolveAccessToken(explicit?: string): string {
  const token = (explicit ?? process.env.BOTMAKER_ACCESS_TOKEN ?? "").trim();
  if (!token) {
    throw new Error(
      "BOTMAKER_ACCESS_TOKEN ausente. Passe accessToken ou defina a env.",
    );
  }
  return token;
}

function headerValue(
  headers: HeadersInit | undefined,
  name: string,
): string | null {
  if (!headers) {
    return null;
  }
  return new Headers(headers).get(name);
}

export function createBotmakerClient(options: BotmakerClientOptions = {}) {
  const accessToken = resolveAccessToken(options.accessToken);
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const sleep = options.sleep ?? defaultSleep;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const logLevel = resolveLogLevel(options);
  const tracedFetch = createTracedFetch(fetchImpl, {
    level: logLevel,
    log: options.logger,
  });
  const fetchWithRetry = createRetryFetch(tracedFetch, {
    maxRetries: options.maxRetries,
    sleep,
  });

  const defaultHeaders = {
    "access-token": accessToken,
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };

  async function request<T = unknown>(
    method: string,
    pathOrUrl: string,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const url = withQuery(resolveUrl(baseUrl, pathOrUrl), requestOptions.query);
    const headers: Record<string, string> = { ...defaultHeaders };
    let body: string | undefined;
    if (requestOptions.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(requestOptions.body);
    }

    const response = await fetchWithRetry(url, {
      method: method.toUpperCase(),
      headers,
      body,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new BotmakerApiError(response.status, url, text);
    }
    if (!text) {
      return null as T;
    }
    return JSON.parse(text) as T;
  }

  const openapi = createOpenApiClient<paths>({
    baseUrl,
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      for (const [key, value] of Object.entries(defaultHeaders)) {
        if (!headerValue(init?.headers, key)) {
          headers.set(key, value);
        }
      }
      return fetchWithRetry(input, { ...init, headers });
    }) as typeof fetch,
  });

  return {
    accessToken,
    baseUrl,
    sleep,
    request,
    openapi,
    fetch: fetchWithRetry,
  };
}

export type BotmakerClient = ReturnType<typeof createBotmakerClient>;
