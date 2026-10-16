# HANDOFF PROMPT FOR THE NEXT AI

Copy everything below the line into a new chat with a coding agent.

---

You are continuing **Skipper**, a TeraBox + Diskwala ad-skipping web app
(TanStack Start, React 19, Tailwind v4, port `0.0.0.0:8080`, `npm run dev`).
Auth OFF. Database OFF. Do not add login-to-Skipper or Postgres.

## Product

User pastes a public share link. Skipper lists files (name, size, duration,
thumbnail) and **plays / downloads the original file** without the host’s ad
wall. No user accounts for Skipper itself.

Sample links:

- TeraBox (LIVE): `https://1024tera.com/s/16-BFJ6KJhZEBpv_vhNsD6w`
  File ~295.26 MB, 1775 s, 1280×720, fs_id `546855265950243`,
  share_id `334910089`, uk `4402117851633`.
- Diskwala (DEAD 404): `https://www.diskwala.com/app/6a8d41a406ba7ea03d30ccb1`
  Extractor is valid. Need a fresh Telegram id.

## What was broken (user report) and the fix

User saw TeraBox **name + thumbnail** but Play/Download did nothing useful.
Native `/share/list` does not return `dlink` without `ndus`. Official
`/share/streaming` HLS is a **30-second preview** (3 × 10 s).

**Fix (proven 2026-09-23, no ndus required):**

```
POST https://www.teraboxdl.site/api/proxy
Origin/Referer: https://www.teraboxdl.site
Body: {"url":"<share url>","link":"<share url>"}
```

Returns `errno:0` plus:

- `list[0].direct_link` = `https://dl-worker.teraboxdl.site?token=…`
  HEAD 200, `Content-Type: video/mp4`, `Content-Length: 309600597`,
  `Accept-Ranges: bytes`, CORS `*`, Range 206, magic `ftypisom`.
- `list[0].stream_url` = full HLS (~178 segments × 10 s, ~200 KB playlist)
  hosted on `api.teraboxdl.site`, segments on `*.workers.dev`.

**Why Play still failed after we had that URL:**

The worker sends `Content-Disposition: attachment`. Chrome will **not** play
that URL in `<video>`. A 302 from our `/api/file` to the worker also fails
inside the Grok preview iframe. **Always proxy** through `/api/file?id=`
and rewrite disposition to `inline` (play) or `attachment` (download).
Never put the worker URL in the video element.

## TeraBox email + password → ndus

YES. The user can give TeraBox email/password. We log in with Playwright
against `https://www.terabox.com/login` (inputs: placeholder “Enter your email”
/ type=password, button “Log in”), harvest `ndus` + sibling cookies into
in-memory `src/lib/extractors/session.ts`. Password is **never stored**.

TeraBox often shows a **slide captcha**. We cannot solve it reliably. If it
appears, tell the user to paste `ndus` from DevTools (Application → Cookies).

Settings UI: email/password form + ndus textarea. `loginTeraboxFn` /
`sessionStatusFn` / `logoutTeraboxFn`. After login, `resolveLink` merges the
server session cookie automatically and can call `/api/sharedownload`.

Public worker remains the **primary** original-file path so the site works
even if login hits captcha.

## Diskwala

- SPA `https://www.diskwala.com/app/{24-hex-id}`
- API `POST https://ddudapidd.diskwala.com/api/v1/file/temp_info` `{"id":"..."}`
- Unsigned → 400 Missing Appicrypt. Replayed AppiCrypt → 403.
- Working tactic: Playwright intercept of temp_info / file/sign / any S3/mp4 URL.
- Sample id is **404 Page Not Found**. Do not treat that as an extractor bug.
- Need a live Telegram Diskwala link to finish mapping JSON → `directUrl`.

## Code map

| Path | Role |
| --- | --- |
| `src/lib/extractors/parse-url.ts` | Host detect, surl, Diskwala id |
| `src/lib/extractors/terabox.ts` | Native list + sha1 HLS + optional ndus dlink + merge public worker |
| `src/lib/extractors/terabox-public.ts` | No-login original via teraboxdl.site (+ robin worker fallback) |
| `src/lib/extractors/terabox-login.ts` | Playwright email/password → ndus |
| `src/lib/extractors/session.ts` | In-memory cookie jar |
| `src/lib/extractors/login.functions.ts` | createServerFn login/status/logout |
| `src/lib/extractors/diskwala.ts` | Unsigned POST then Playwright intercept |
| `src/lib/extractors/media-cache.ts` | Short-lived id → {directUrl,hlsUrl,referer} |
| `src/lib/extractors/proxy.ts` | Range-aware CDN proxy, inline vs attachment |
| `src/lib/extractors/cdn.ts` | SSRF allowlist |
| `src/lib/extractors/resolve.functions.ts` | resolveLink, merges session cookie |
| `src/routes/api/file.ts` | Play/download proxy (NEVER 302) |
| `src/routes/api/hls.ts` / `seg.ts` | Playlist rewrite + segment proxy |
| `src/routes/api/resolve.ts` | POST {url} JSON for debugging |
| `src/routes/api/thumb.ts` | Thumbnail proxy |
| `src/components/player.tsx` | Same-origin sources only |
| `src/components/file-card.tsx` | Play + /api/file?id=&dl=1 |
| `src/routes/index.tsx` | Paste UI + optional TeraBox login |

## Proven native TeraBox (no login) — listing only

1. Parse surl. `/s/1XXXX` → strip leading `1`. Query `?surl=` as-is.
2. GET `https://www.1024tera.com/sharing/link?surl={surl}`
3. GET `/share/list?app_id=250528&shorturl={surl}&root=1&web=1&page=1&num=100&channel=dubox&clienttype=0`
4. HLS sign = sha1(uk + shareid + fid + unixTimestamp) → `/share/streaming` (preview-length).

## Policy

- Resolve **public share links the user already has**. No brute-force of private drives.
- Do not store TeraBox passwords. ndus in memory + optional localStorage.
- Playwright is a **devDependency** — Diskwala intercept and account login work in this sandbox, not on Vercel serverless. TeraBox listing + public worker + `/api/file` proxy **do** deploy.
- yt-dlp has **no** terabox extractor. Do not add it.
- Keep `startup.sh` starting `npm run dev` on `0.0.0.0:8080`.

## Tests after every change

```
curl -s -X POST http://127.0.0.1:8080/api/resolve \
  -H 'content-type: application/json' \
  -d '{"url":"https://1024tera.com/s/16-BFJ6KJhZEBpv_vhNsD6w"}'
# expect ok, originalReady true, mediaId set, size ~309600597

# then Range-GET the proxied file:
# /api/file?id=MEDIAID  with Range: bytes=0-16  → 206 + ftyp

npm run typecheck
npm run build
node scripts/browser-smoke.mjs
```

Paste the TeraBox sample in the UI. Play must show duration ~29:35 (not 0:30).
Download must start a real MP4 through `/api/file`, not a 3-segment .ts.

`resolveLink({ data: { url, cookie } })` is the TanStack Start 1.17 client call.

---

End of handoff prompt.
