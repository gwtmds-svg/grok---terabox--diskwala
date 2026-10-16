import { allowSegments } from "./media-cache";

/** Rewrite a playlist so every segment stays on this origin and is tied to one media id. */
export function rewritePlaylist(playlist: string, base: string, id: string, origin: string): string {
  const allow: string[] = [];
  const proxied = (abs: string) => {
    allow.push(abs);
    return `${origin}/api/seg?id=${encodeURIComponent(id)}&u=${encodeURIComponent(abs)}`;
  };
  const lines = playlist.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/gi, (full, uri: string) => {
        try {
          return `URI="${proxied(new URL(uri, base).href)}"`;
        } catch {
          return full;
        }
      });
    }
    try {
      return proxied(new URL(trimmed, base).href);
    } catch {
      return line;
    }
  });
  allowSegments(id, allow);
  return lines.join("\n");
}
