# Skipper — complete A–Z build and operations guide

Written 2026-08-29 after live reverse engineering of TeraBox and Diskwala.
This is the runbook, not marketing. Pair with `docs/AI_HANDOFF_PROMPT.md`.

---

## 0. Goal

A web app where a user pastes a TeraBox or Diskwala share link and receives:

- File list (name, size, type, duration, thumbnail)
- In-browser playback without ads
- Direct download of the file (stream always; original when possible)

No app install. No host account required for list + play.

---

## 1. What we learned (internet + live traffic)

Public TeraBox downloaders (terasaver.com, saahiyo/terabox-gateway,
Damantha126/TeraboxDL, eyeblech/tera-dl, Ronnie7866/terabox-downloader-online,
abhinai2244/TeraBox-Dl) converge on the same facts:

| Step | Login needed? | Notes |
| --- | --- | --- |
| Parse surl | No | Strip leading `1` on `/s/1…` |
| jsToken from share HTML | No | Guest cookies only |
| `/share/list` metadata | No | Confirmed live on the sample |
| HLS `/share/streaming` | No | Confirmed; sha1 sign |
| Original `dlink` / PCS URL | **Yes, `ndus` cookie** | errno -6 / verify_v2 otherwise |
| Diskwala `temp_info` | No account, but **AppiCrypt** | WASM, origin-bound |

yt-dlp has **no** terabox.py extractor (404 on master). Do not depend on it.

Diskwala.Net and similar sites exist; they do not publish their AppiCrypt
bypass. Playwright intercept is the honest method.

---

## 2. Cookies — the question, answered

**Does the user have to log in and give cookies?**

- **List files:** no.
- **Play HLS:** no.
- **Download original TeraBox file:** yes, one `ndus` cookie, optional, pasted
  in Settings, stored in `localStorage` (`skipper.ndus`). Never sent to a
  third party. Never committed to git.

**Do we need 10+ account cookies baked into the code?**

No for a personal / preview app. Yes as a *reliability tactic* if you run a
public original-download service:

1. Create 5–10 throwaway TeraBox accounts (email + app).
2. Log in once per account in a real browser, copy `ndus` (and optionally
   `ndut_fmt`, `csrfToken`, `browserid`).
3. Keep them in a server-side env var `TERABOX_NDUS_POOL=ndus=A,ndus=B,…` —
   **not** in the client bundle, **not** in this repo.
4. Round-robin. On errno -6 / 400210, mark that cookie dead and rotate.
5. Refresh cookies every few weeks; they expire.

Skipper today uses **zero baked cookies**. The Settings field is the user’s
own session if they want originals.

**How to copy ndus**

1. Log in at terabox.com / 1024tera.com.
2. DevTools → Application → Cookies → `ndus`.
3. Paste `ndus=Y…` into Skipper Settings.

---

## 3. Core technique (the policy)

1. **Never scrape the ad page for the file.** Talk to `/share/list` and
   `/share/streaming`. Ads are a UI layer; the file API is separate.
2. **Server-side resolve.** Browser JS cannot call TeraBox/Diskwala due to
   CORS. `createServerFn` + `/api/*` proxies.
3. **Do not become a CDN.** When a dlink exists, redirect the browser at the
   PCS URL. Only proxy HLS segments (small) and thumbs. Proxying 300 MB
   originals will bankrupt a free host.
4. **Fast path first.** TeraBox list is one HTML GET + one JSON GET (~1–2 s).
   Playwright is the slow path (Diskwala, or a future “deep extract”).
5. **Fail closed on unknown hosts.** Do not fetch arbitrary URLs in `/api/seg`.
   Allowlist `freeterabox.com`, `1024tera.com`, `terabox.com`, `teraboxcdn.com`,
   `baidupcs.com`, `diskwala.com`.

---

## 4. TeraBox protocol (accurate)

### 4.1 Domains

terabox.com, terabox.app, teraboxshare.com, 1024tera.com, 1024terabox.com,
teraboxapp.com, dubox.com, freeterabox.com, plus regional mirrors. Same
`app_id=250528`, same Baidu-pan heritage.

### 4.2 surl

- `https://1024tera.com/s/16-BFJ6KJhZEBpv_vhNsD6w` → surl `6-BFJ6KJhZEBpv_vhNsD6w`
- `https://www.1024tera.com/sharing/link?surl=6-BFJ6KJhZEBpv_vhNsD6w` → as-is

### 4.3 List

```
GET /share/list
  app_id=250528
  shorturl={surl}
  root=1          # 0 when expanding a folder
  dir={path}      # only when root=0
  web=1
  page=1
  num=100
  channel=dubox
  clienttype=0
  jsToken={optional}
```

Headers: `User-Agent` desktop Chrome, `Referer` share page, `Cookie` guest
(+ ndus if present).

### 4.4 Stream sign

```
sign = SHA1( string(uk) + string(shareid) + string(fid) + string(unix_ts) )
```

Live-confirmed 2026-08-29. Types that returned `#EXTM3U`: `M3U8_AUTO_480`,
`M3U8_FLV_264_480`, `M3U8_AUTO_360`, `M3U8_FLV_264_360`, `M3U8_AUTO_240`.

### 4.5 Original

```
POST /api/sharedownload?app_id=250528&channel=dubox&clienttype=0&web=1
body: product=share&uk=&primaryid={shareid}&fid_list=[{fs_id}]
Cookie: ndus=…
```

Then HEAD the `dlink` to resolve the CDN.

Password shares: `errno -9`. Flow is `/share/verify` with `pwd` → `sekey`
cookie → list again. Not implemented yet.

---

## 5. Diskwala protocol

```
POST https://ddudapidd.diskwala.com/api/v1/file/temp_info
Origin: https://www.diskwala.com
Content-Type: application/json
Appicrypt: <WASM token>
Appicrypt-ts: <timestamp>
{ "id": "<24-char hex>" }
```

Without Appicrypt: 400. With a stolen header: 403.

Implementation: Playwright `page.on('response')` for `temp_info`,
`file/sign`, `playlist_info`. Map JSON into `ResolvedFile`.

Chromium is required. Vercel serverless cannot launch it. Options for
production Diskwala:

- Always-on VM / Fly.io / Railway worker with Playwright
- Browserless / Cloudflare Browser Rendering
- Give up Diskwala on the serverless deploy and keep TeraBox (pure HTTP)

---

## 6. A–Z checklist to keep it running

**A.** Desktop Chrome UA on every upstream request.
**B.** Follow redirects on the share HTML (some `/s/` links 302).
**C.** Always send Referer of the same host you listed.
**D.** Cache list JSON in memory ~60 s per surl (hosts rate-limit).
**E.** Paginate `page=` if `list.length == num`.
**F.** Recurse folders with a depth cap.
**G.** Retry list 2× on network errors; do not retry errno 2 (dead share).
**H.** Treat errno -6 / 400210 as “cookie dead”, not “share dead”.
**I.** HLS: try AUTO_480 then FLV_264_480 then 360.
**J.** Rewrite every `http` line in the m3u8 through `/api/seg`.
**K.** Allowlist CDN hosts in the segment proxy.
**L.** Pass `Range` through on `/api/seg` so seeking works.
**M.** Thumbs via `/api/thumb` (signed URLs expire ~8 h).
**N.** Never log cookies or AppiCrypt headers.
**O.** Timeout TeraBox fetch at 15 s, Playwright at 25 s.
**P.** Diskwala 404 page title → friendly “file gone”, not a crash.
**Q.** Optional ndus in localStorage, never in the URL bar except the
    download query (prefer a POST download later so cookies stay out of
    access logs).
**R.** If you add a cookie pool, store it in env, rotate, health-check hourly.
**S.** Do not download through the server when `Location` is a CDN — 302.
**T.** HLS concat download is MPEG-TS (`.ts`). VLC plays it. Remux to mp4
    needs ffmpeg on the worker, not in this sandbox.
**U.** Keep `startup.sh` healthy; preview dies without it.
**V.** `npm run typecheck` and `npm run build` after extractor edits.
**W.** Smoke the UI with the live TeraBox sample after every UI change.
**X.** If TeraBox changes the sign, capture `/share/streaming` in Playwright
    (`scripts/_re_extract.mjs`) and compare; do not guess a new hash blindly.
**Y.** Legal: public shares only. No private-drive crawling.
**Z.** When in doubt, prefer a working list+play over a broken original
    downloader. The ad-skip value is already in the list.

---

## 7. Plugins / extra tools — needed or not

| Tool | Use? | Why |
| --- | --- | --- |
| yt-dlp | No | No terabox extractor |
| ffmpeg | Optional later | Remux HLS `.ts` → `.mp4` |
| Playwright | Yes, Diskwala + RE | Already a workspace devDependency |
| hls.js | Yes | In-browser play |
| aria2 | No | Browser download is enough |
| AppiCrypt WASM in Node | No | Failed; use Playwright |
| Cookie-editor userscript | Docs only | How users copy ndus |
| Cloudflare Worker | Optional scale | Put `/api/seg` at the edge |

No custom browser extension is required for v1.

---

## 8. Scaling / “forever free”

- TeraBox list+HLS: a few KB of JSON per paste. Fits a free Vercel function.
- Segment proxy: each viewer’s video bytes go through you. That is the cost
  centre. Mitigations: (1) only proxy if CORS blocks, (2) short cache, (3)
  move `/api/seg` to a cheap VPS, (4) for originals, 302 to PCS.
- Cookie pool: free accounts, not paid TeraBox premium.
- Diskwala: one Chromium instance, serialise jobs, 10 s timeout, cache by id.

---

## 9. File-by-file (this repo)

See the table in `docs/AI_HANDOFF_PROMPT.md`. Reverse-engineering scratch
scripts (`re_both.mjs`, `re_capture.mjs`, `re_dw.mjs`, `re_dw2.mjs`,
`re_stealth.mjs`, `scripts/_re_*.mjs`, `scripts/_capture-hosts.mjs`) are
evidence, not runtime.

---

## 10. Known gaps (do these next)

1. HLS for the sample is a short transcode, not the 29-minute original.
   Deep-extract with Playwright on the official player, or ndus dlink.
2. Diskwala sample is 404. Need a live id to lock the JSON schema.
3. Password shares, deep folders, batch download zip.
4. Cookie not in download query string (use POST).
5. Production Diskwala worker with Chromium.
6. ffmpeg remux for `.mp4` downloads.

---

## 11. Local run (for an AI in this workspace)

```
sh /workspace/startup.sh
# app on 0.0.0.0:8080
```

Do not tell the human user about ports. They only have the live preview.
