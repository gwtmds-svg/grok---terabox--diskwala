# Skipper

Paste a TeraBox or Diskwala share link. See the files. Play or download the
**original** without the ad wall.

## Status (2026-09-23)

- TeraBox listing: **working**, no login.
- TeraBox original Play + Download: **working without ndus** via
  `POST https://www.teraboxdl.site/api/proxy` → worker MP4, proxied through
  `/api/file` (inline disposition + Range). Do **not** feed the worker URL to
  `<video>` — it sends `Content-Disposition: attachment`.
- TeraBox account: **optional**. Settings → email/password harvests `ndus`
  (Playwright). Slide captcha may block; paste ndus instead.
- Diskwala: Playwright + AppiCrypt intercept. Sample id is **404**. Need a
  fresh Telegram link.

Live TeraBox sample: `https://1024tera.com/s/16-BFJ6KJhZEBpv_vhNsD6w` (~295 MB, 29:35).

## For the next builder

1. [`docs/AI_HANDOFF_PROMPT.md`](docs/AI_HANDOFF_PROMPT.md) — paste into a new AI chat
2. [`docs/CONTINUE.md`](docs/CONTINUE.md) — short status + next steps
3. [`docs/COMPLETE_BUILD_GUIDE.md`](docs/COMPLETE_BUILD_GUIDE.md) — A–Z protocol

## Run

```
npm install
npm run dev
```

Port 8080. No database. No Skipper user accounts.
"# grok---terabox--diskwala" 
