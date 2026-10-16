const KEY = "skipper.history.v1";
const COOKIE_KEY = "skipper.ndus";
const MAX = 12;

export type HistoryItem = {
  url: string;
  title: string;
  host: string;
  at: number;
  fileCount: number;
};

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushHistory(item: HistoryItem): HistoryItem[] {
  const next = [item, ...loadHistory().filter((h) => h.url !== item.url)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearHistory(): void {
  localStorage.removeItem(KEY);
}

export function loadCookie(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(COOKIE_KEY) ?? "";
}

export function saveCookie(value: string): void {
  if (!value.trim()) localStorage.removeItem(COOKIE_KEY);
  else localStorage.setItem(COOKIE_KEY, value.trim());
}
