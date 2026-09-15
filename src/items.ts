export function itemsOf<T = unknown>(
  payload: unknown,
  key = "items",
): T[] {
  if (payload == null) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (typeof payload === "object") {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }
  return [];
}
