export const DEFAULT_BASE_URL = "https://api.botmaker.com/v2.0";

export function resolveBaseUrl(baseUrl?: string): string {
  const raw =
    baseUrl ?? process.env.BOTMAKER_API_BASE ?? DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function resolveUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${path}`;
}

export function withQuery(
  url: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!query) {
    return url;
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  const qs = params.toString();
  if (!qs) {
    return url;
  }
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}
