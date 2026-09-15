export type SleepFn = (ms: number) => Promise<void>;

export const defaultSleep: SleepFn = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export type RetryFetchOptions = {
  maxRetries?: number;
  sleep?: SleepFn;
};

function retryWaitMs(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return seconds * 1000;
    }
  }
  return 1500 + attempt * 1000;
}

export function createRetryFetch(
  fetchImpl: typeof fetch,
  options: RetryFetchOptions = {},
): typeof fetch {
  const maxRetries = options.maxRetries ?? 5;
  const sleep = options.sleep ?? defaultSleep;

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    let lastResponse: Response | undefined;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const response = await fetchImpl(input, init);
      if (response.status !== 429 || attempt + 1 >= maxRetries) {
        return response;
      }
      lastResponse = response;
      await response.arrayBuffer();
      await sleep(retryWaitMs(response, attempt));
    }
    return lastResponse as Response;
  }) as typeof fetch;
}
