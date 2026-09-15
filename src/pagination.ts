export type PagePayload<T, K extends string = "items"> = {
  nextPage?: string | null;
} & Record<K, T[] | undefined>;

export type CollectPagesOptions<T> = {
  first: string;
  request: (method: string, pathOrUrl: string) => Promise<unknown>;
  itemsKey?: string;
  nextKey?: string;
  sleepMs?: number;
  sleep?: (ms: number) => Promise<void>;
  mapItems?: (payload: Record<string, unknown>) => T[];
  maxPages?: number;
};

export async function collectPagesWithMeta<T>(
  options: CollectPagesOptions<T>,
): Promise<{ items: T[]; truncated: boolean; pages: number }> {
  const itemsKey = options.itemsKey ?? "items";
  const nextKey = options.nextKey ?? "nextPage";
  const sleepMs = options.sleepMs ?? 0;
  const sleep = options.sleep ?? (async () => undefined);
  const all: T[] = [];
  let url: string | null = options.first;
  let page = 0;
  const maxPages = options.maxPages;

  while (url) {
    if (maxPages != null && page >= maxPages) {
      return { items: all, truncated: true, pages: page };
    }
    if (page > 0 && sleepMs > 0) {
      await sleep(sleepMs);
    }
    page += 1;
    const payload = await options.request("GET", url);
    if (payload === null || payload === undefined) {
      break;
    }
    if (typeof payload !== "object") {
      throw new Error(`Resposta inesperada em ${url}: ${typeof payload}`);
    }
    const record = payload as Record<string, unknown>;
    const raw = options.mapItems
      ? options.mapItems(record)
      : record[itemsKey];
    const batch = Array.isArray(raw) ? (raw as T[]) : [];
    all.push(...batch);
    const next = record[nextKey];
    url = typeof next === "string" && next.length > 0 ? next : null;
  }

  return { items: all, truncated: false, pages: page };
}

export async function collectPages<T>(
  options: CollectPagesOptions<T>,
): Promise<T[]> {
  const { items } = await collectPagesWithMeta(options);
  return items;
}
