export type BotmakerLogLevel = "off" | "debug" | "trace";

export type BotmakerLogger = (line: string) => void;

const REDACT_HEADERS = new Set([
  "access-token",
  "authorization",
  "cookie",
  "set-cookie",
  "x-hasura-admin-secret",
]);

const BODY_MAX = 8000;

export function resolveLogLevel(options: {
  debug?: boolean | BotmakerLogLevel;
  trace?: boolean;
} = {}): BotmakerLogLevel {
  if (options.trace === true || options.debug === "trace") {
    return "trace";
  }
  if (options.debug === true || options.debug === "debug") {
    return "debug";
  }
  const envTrace = (process.env.BOTMAKER_TRACE ?? "").trim();
  const envDebug = (process.env.BOTMAKER_DEBUG ?? "").trim().toLowerCase();
  if (envTrace === "1" || envTrace.toLowerCase() === "true" || envDebug === "trace") {
    return "trace";
  }
  if (envDebug === "1" || envDebug === "true" || envDebug === "debug") {
    return "debug";
  }
  return "off";
}

export function redactHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) {
    return out;
  }
  new Headers(headers).forEach((value, key) => {
    out[key] = REDACT_HEADERS.has(key.toLowerCase()) ? redactSecret(value) : value;
  });
  return out;
}

function redactSecret(value: string): string {
  if (value.length <= 12) {
    return "***";
  }
  return `${value.slice(0, 6)}…***(len=${value.length})`;
}

function clipBody(text: string): string {
  if (text.length <= BODY_MAX) {
    return text;
  }
  return `${text.slice(0, BODY_MAX)}…[truncated ${text.length - BODY_MAX} chars]`;
}

function readInitBody(init?: RequestInit): string | undefined {
  if (!init || init.body == null) {
    return undefined;
  }
  if (typeof init.body === "string") {
    return init.body;
  }
  return `[${init.body.constructor?.name ?? "body"}]`;
}

export function createTracedFetch(
  fetchImpl: typeof fetch,
  options: {
    level: BotmakerLogLevel;
    log?: BotmakerLogger;
  },
): typeof fetch {
  const { level } = options;
  if (level === "off") {
    return fetchImpl;
  }
  const log = options.log ?? ((line: string) => console.error(line));
  const tag = `[botmaker ${level}]`;

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(
      input instanceof Request ? input.url : input,
    );
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const started = Date.now();
    log(`${tag} --> ${method} ${url}`);
    if (level === "trace") {
      const headers =
        init?.headers ??
        (input instanceof Request ? input.headers : undefined);
      log(`${tag} --> headers ${JSON.stringify(redactHeaders(headers))}`);
      const body = readInitBody(init);
      if (body !== undefined) {
        log(`${tag} --> body ${clipBody(body)}`);
      }
    }
    try {
      const response = await fetchImpl(input, init);
      log(
        `${tag} <-- ${response.status} ${method} ${url} ${Date.now() - started}ms`,
      );
      if (level === "trace") {
        log(
          `${tag} <-- headers ${JSON.stringify(redactHeaders(response.headers))}`,
        );
        const text = await response.clone().text();
        if (text) {
          log(`${tag} <-- body ${clipBody(text)}`);
        }
      }
      return response;
    } catch (err) {
      log(
        `${tag} !! ${method} ${url} ${Date.now() - started}ms ${err instanceof Error ? err.message : String(err)}`,
      );
      throw err;
    }
  }) as typeof fetch;
}
