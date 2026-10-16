# Skipper — status for the next builder (2026-10-07)

## Goal
Paste TeraBox / Diskwala / Blatim public share links (or a Telegram post that contains them) → list files → Play the full video in-browser and Download the original bytes, with no host ads and without forcing the visitor to log in. Folder Pack walks a related folder and zips it.

## Done
- TeraBox anonymous listing (`/share/list` + `/api/shorturlinfo`) — name, size, duration, thumbnail. Native folders still recurse, but Open does not wait on them.
- TeraBox original file WITHOUT ndus via `POST https://www.teraboxdl.site/api/proxy` → `dl-worker.teraboxdl.site?token=…` (full MP4, Range, CORS). First Open returns as soon as the worker answers; native listing is a 2.5s bonus, not a blocker.
- Folder Pack pages that same worker with `dir` + `page` when `has_more` / folders are in the listing (cap 60 files, 12 dirs, 16s). It does not request a parent directory — a bad `dir` is returned as "expired". A private account is not listable from one share (`/api/user/getinfo` errno -6). Blatim `files` RLS returns nothing to the anon key; only `get_public_watch_file` is public.
- Background host check: `GET /api/status` returns the last snapshot immediately and learns in the background. It yields while someone is opening a link. Learns the worker path and whether the client still sends `dir`/`page`.
- Same-origin `/api/file` proxy so `<video>` actually plays (worker sends `Content-Disposition: attachment`).
- Full HLS fallback from the same public resolver, proxied `/api/hls` + `/api/seg`.
- Optional TeraBox email/password login via Playwright to harvest `ndus` (captcha may block).
- TeraBox mirrors including `teraboxshare.com/s/…`, `teraboxlinke.com/v/…` (hop → `teraboxlink.com` / `1024terabox.com`), `/v/` paths, and a leading-1 tried both ways.
- Paste unwrap: messy Telegram captions, `t.me/s/channel/post`, bare 24-hex Diskwala ids. Folder Pack collects every nested share.
- **Diskwala original file via the same public worker** (plus thediskwala / playdiskwala free endpoints as fallback). Official `/app/:id` is an app-install SPA that paints "Page Not Found" even when the file is live.
- **Diskwala Pack** walks `/app` + `/playlist` + `/creator`. Only merges album files that share the CDN storage prefix with the seed.
- **Blatim watch unwrap.** External uploads expose `sourceUrl` (VidBunker or nested TeraBox/Diskwala).
- **Folder Pack** is the same second paste bar for all three hosts — zip of every original file.

## Not done
- Automatic slide-captcha solve for TeraBox login.
- Cookie pool persistence across process restarts (in-memory only + client localStorage ndus).
- Folder recursion beyond the worker’s published pages; password-protected TeraBox shares (`errno -9`). Whole-account dumps are not possible without the uploader’s login.
- Native Diskwala AppiCrypt signing (WASM). Unsigned / Playwright-signed calls 403; skip-site free extractors currently 502 when the worker is down.
- Blatim *local* original stream (needs Firebase App Check `/api/video/:slug/sign`). External VidBunker/TeraBox/Diskwala watches play.

## Do next
1. If a Diskwala link fails, retry the worker (www then apex, then skip sites). Never scrape the Diskwala SPA title.
2. If Blatim `sourceUrl` is empty (`uploadSource: local`), do not treat the watch page HTML as a 404.
3. If the user sends TeraBox email+password, call `loginTerabox` and store ndus; if captcha, ask for pasted ndus.

## Do not
- Add Skipper user accounts or Postgres.
- Add yt-dlp (no terabox extractor).
- Put the worker URL in `<video src>`.
- 302 the browser to the worker for Play.
- Treat Diskwala's SPA "Page Not Found" as the file being gone.
- Mix Diskwala playlist dumps that live under a different CDN storage prefix than the pasted id.
- Race www + apex in parallel (rate-limits the first paste).
