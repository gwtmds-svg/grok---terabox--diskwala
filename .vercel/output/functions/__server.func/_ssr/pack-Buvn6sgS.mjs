import { createHash, randomBytes } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/pack-Buvn6sgS.js
var TERABOX_HOSTS = [
	"terabox.com",
	"terabox.app",
	"terabox.fun",
	"teraboxapp.com",
	"teraboxshare.com",
	"teraboxlink.com",
	"teraboxlinke.com",
	"terasharelink.com",
	"terafileshare.com",
	"terasharefile.com",
	"terashareus.com",
	"teraboxurl.com",
	"terabox.link",
	"teraboxfree.com",
	"teraboxsharefile.com",
	"terabox.club",
	"terabox.click",
	"1024tera.com",
	"1024tera.co",
	"1024terabox.com",
	"1024-terabox.com",
	"1024box.com",
	"tera1024box.com",
	"dubox.com",
	"freeterabox.com",
	"4funbox.com",
	"4funbox.co",
	"nephobox.com",
	"mirrobox.com",
	"momerybox.com",
	"tibibox.com",
	"gibibox.com",
	"pebibox.com",
	"cybernewhub.com"
];
var DISKWALA_HOSTS = [
	"diskwala.com",
	"diskwala.app",
	"diskwala.net",
	"diskwala.in"
];
var BLATIM_HOSTS = ["blatim.com", "blatim.app"];
var TELEGRAM_HOSTS = [
	"t.me",
	"telegram.me",
	"telegram.dog",
	"telegram.org"
];
var SURL_RE = /^[A-Za-z0-9_-]{8,64}$/;
var HEX24_RE = /\b[a-fA-F0-9]{24}\b/;
var HTTP_URL_RE = /https?:\/\/[^\s<>"'\]\)]+/gi;
function hostnameOf(raw) {
	try {
		return new URL(raw.trim()).hostname.replace(/^www\./, "").toLowerCase();
	} catch {
		return null;
	}
}
function isTeraboxHost(host) {
	if (TERABOX_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
	if (host.includes("terabox") || host.includes("terashare") || host.includes("terafile")) return true;
	if (host.includes("1024tera") || host.includes("funbox") || host.includes("nephobox")) return true;
	if (host.includes("mirrobox") || host.includes("momerybox") || host.includes("tibibox")) return true;
	if (/(^|\.)tera/.test(host) && /link|share|box|file|hub/.test(host)) return true;
	return false;
}
function detectHost(raw) {
	const host = hostnameOf(raw);
	if (!host) return "unknown";
	if (TELEGRAM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "telegram";
	if (isTeraboxHost(host)) return "terabox";
	if (DISKWALA_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "diskwala";
	if (BLATIM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "blatim";
	return "unknown";
}
function isRedirectorHost(raw) {
	const host = hostnameOf(raw);
	if (!host) return false;
	return host.includes("linke") || host.includes("cybernewhub") || host.includes("staela") || host.endsWith("teraboxlinke.com");
}
/**
* TeraBox short codes:
*   https://1024tera.com/s/1XXXX  → keep the path as-is; variants try with and without the 1
*   https://www.1024tera.com/sharing/link?surl=XXXX
*   https://terabox.com/s/XXXX
*   https://teraboxlinke.com/v/XXXX   (JS hop onto teraboxlink / 1024terabox)
*   https://www.terabox.app/wap/share/filelist?surl=XXXX
*/
function extractTeraSurl(raw) {
	try {
		const u = new URL(raw.trim());
		const q = u.searchParams.get("surl") || u.searchParams.get("shorturl") || u.searchParams.get("s");
		if (q) return normalizeSurl(q);
		const parts = u.pathname.split("/").filter(Boolean);
		const markers = /* @__PURE__ */ new Set([
			"s",
			"share",
			"sharing",
			"filelist",
			"v",
			"link",
			"watch",
			"f",
			"video"
		]);
		const sIdx = parts.findIndex((p) => markers.has(p.toLowerCase()));
		if (sIdx >= 0 && parts[sIdx + 1]) {
			const next = decodeURIComponent(parts[sIdx + 1]).split(/[.?#]/)[0];
			if (next && next.toLowerCase() !== "link" && next.toLowerCase() !== "filelist" && next.toLowerCase() !== "player") return normalizeSurl(next);
		}
		const last = parts[parts.length - 1];
		if (last && SURL_RE.test(last) && last.toLowerCase() !== "player") return normalizeSurl(last);
		return null;
	} catch {
		return null;
	}
}
function normalizeSurl(surl) {
	return decodeURIComponent(surl).trim().replace(/\/+$/, "");
}
/** Official 1024tera /s/1XXXX vs raw XXXX — try both, never guess only one. */
function surlVariants(surl) {
	const s = normalizeSurl(surl);
	if (!s) return [];
	const out = [s];
	if (/^1[\w-]{8,}$/.test(s)) out.push(s.slice(1));
	else out.push(`1${s}`);
	return uniqueStrings(out);
}
function uniqueStrings(urls) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const u of urls) {
		if (!u || seen.has(u)) continue;
		seen.add(u);
		out.push(u);
	}
	return out;
}
/** Diskwala share ids live at /app/:id (24-char hex), /playlist/:id, /f/:id, or ?id= */
function extractDiskwalaId(raw) {
	try {
		const u = new URL(raw.trim());
		const q = u.searchParams.get("id") || u.searchParams.get("file_id") || u.searchParams.get("fid");
		if (q && /^[a-f0-9]{16,}$/i.test(q)) return q;
		const parts = u.pathname.split("/").filter(Boolean);
		const appIdx = parts.findIndex((p) => p === "app" || p === "f" || p === "file" || p === "v" || p === "playlist" || p === "creator" || p === "share" || p === "watch" || p === "p");
		if (appIdx >= 0 && parts[appIdx + 1]) return parts[appIdx + 1].split(".")[0];
		const last = parts[parts.length - 1];
		if (last && /^[a-f0-9]{16,}$/i.test(last)) return last;
		return null;
	} catch {
		const m = raw.match(HEX24_RE);
		return m ? m[0] : null;
	}
}
function canonicalTeraboxUrl(surl) {
	const code = surl.replace(/^1/, "");
	return `https://www.1024tera.com/sharing/link?surl=${encodeURIComponent(code)}`;
}
function canonicalDiskwalaUrl(id, kind = "app") {
	return `https://www.diskwala.com/${kind}/${id}`;
}
/** Blatim public watch ids live at /watch/:slug (16-char base62). */
function extractBlatimSlug(raw) {
	try {
		const parts = new URL(raw.trim()).pathname.split("/").filter(Boolean);
		const watchIdx = parts.findIndex((p) => p === "watch" || p === "v" || p === "video" || p === "f");
		if (watchIdx >= 0 && parts[watchIdx + 1]) {
			const slug = decodeURIComponent(parts[watchIdx + 1]).split("?")[0];
			if (/^[A-Za-z0-9_-]{6,64}$/.test(slug)) return slug;
		}
		const last = parts[parts.length - 1];
		if (last && /^[A-Za-z0-9_-]{8,64}$/.test(last) && last !== "watch") return last;
		return null;
	} catch {
		return null;
	}
}
function canonicalBlatimUrl(slug) {
	return `https://www.blatim.com/watch/${encodeURIComponent(slug)}`;
}
function extractUrlsFromText(text) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	for (const raw of text.match(HTTP_URL_RE) || []) {
		const u = raw.replace(/[.,;:!?]+$/g, "");
		if (!u || seen.has(u)) continue;
		seen.add(u);
		out.push(u);
	}
	return out;
}
/** Strip Telegram junk / zero-width chars and pick the first real share URL. */
function normalizePaste(raw) {
	const text = raw.replace(/[\u200b\u200c\u200d\ufeff]/g, " ").trim();
	if (!text) return "";
	const urls = extractUrlsFromText(text);
	const ranked = urls.map((u) => ({
		u,
		host: detectHost(u)
	}));
	const known = ranked.find((r) => r.host === "terabox" || r.host === "diskwala" || r.host === "blatim");
	if (known) return known.u;
	const tg = ranked.find((r) => r.host === "telegram");
	if (tg) return tg.u;
	if (urls[0]) return urls[0];
	const hex = text.match(HEX24_RE);
	if (hex) return canonicalDiskwalaUrl(hex[0]);
	return text;
}
function teraboxCandidateUrls(shareUrl) {
	const surl = extractTeraSurl(shareUrl);
	if (!surl) return [shareUrl];
	const variants = surlVariants(surl);
	const mapped = [shareUrl];
	for (const s of variants) {
		const withOne = s.startsWith("1") ? s : `1${s}`;
		mapped.push(`https://1024terabox.com/s/${withOne}`, `https://1024tera.com/s/${withOne}`, `https://teraboxlink.com/s/${s}`, canonicalTeraboxUrl(s));
	}
	return uniqueStrings(mapped).slice(0, 6);
}
var MEDIA_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
var ALLOW = [
	"freeterabox.com",
	"terabox.com",
	"terabox.app",
	"terabox.fun",
	"teraboxcdn.com",
	"teraboxpage.com",
	"teraboxdl.site",
	"dl-worker.teraboxdl.site",
	"1024tera.com",
	"1024tera.co",
	"1024terabox.com",
	"1024box.com",
	"4funbox.com",
	"4funbox.co",
	"nephobox.com",
	"mirrobox.com",
	"momerybox.com",
	"tibibox.com",
	"teraboxapp.com",
	"teraboxshare.com",
	"teraboxlink.com",
	"teraboxlinke.com",
	"terasharelink.com",
	"terafileshare.com",
	"terasharefile.com",
	"teraboxurl.com",
	"dubox.com",
	"diskwala.com",
	"diskwala.app",
	"diskwala.net",
	"diskwala-fast-edge.net",
	"revwala.com",
	"dw2in.com",
	"litedns.xyz",
	"blatim.com",
	"vidbunker.in",
	"vidbunker.com",
	"vidbunker.net",
	"supabase.co",
	"amazonaws.com",
	"cloudfront.net",
	"baidupcs.com",
	"workers.dev",
	"r2.dev",
	"googleapis.com",
	"googleusercontent.com",
	"digitaloceanspaces.com",
	"wasabisys.com",
	"backblazeb2.com",
	"b-cdn.net",
	"cdninstagram.com",
	"fbcdn.net",
	"storage.googleapis.com"
];
function isAllowedCdn(url) {
	try {
		const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
		return ALLOW.some((d) => host === d || host.endsWith(`.${d}`));
	} catch {
		return false;
	}
}
var MAX_SHARES = 8;
function unique(urls) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const u of urls) {
		if (!u || seen.has(u)) continue;
		seen.add(u);
		out.push(u);
	}
	return out;
}
function knownHost(url) {
	const h = detectHost(url);
	return h === "terabox" || h === "diskwala" || h === "blatim";
}
function mapRedirector(url) {
	if (!isRedirectorHost(url) && detectHost(url) !== "terabox") return [url];
	const surl = extractTeraSurl(url);
	if (!surl) return [url];
	if (!isRedirectorHost(url)) return [url];
	const withOne = surl.startsWith("1") ? surl : `1${surl}`;
	return unique([
		`https://teraboxlink.com/s/${surl}`,
		`https://1024terabox.com/s/${withOne}`,
		`https://1024tera.com/s/${withOne}`,
		canonicalTeraboxUrl(surl)
	]);
}
function telegramPages(url) {
	try {
		const parts = new URL(url.trim()).pathname.split("/").filter((p) => p && p !== "s");
		const channel = parts[0];
		const post = parts[1];
		if (!channel || channel.startsWith("+") || channel.startsWith("c")) return [];
		if (post && /^\d+$/.test(post)) return unique([`https://t.me/${channel}/${post}?embed=1`, `https://t.me/s/${channel}/${post}`]);
		return [`https://t.me/s/${channel}`];
	} catch {
		return [];
	}
}
function sharesFromHtml(html) {
	const hrefs = [...extractUrlsFromText(html), ...html.match(/https?:\/\/(?:www\.)?(?:diskwala|terabox|1024tera|blatim)[^\s"'<>]*/gi) || []];
	const out = [];
	for (const raw of hrefs) {
		const u = raw.replace(/[.,;]+$/g, "").replace(/&/g, "&");
		if (knownHost(u)) out.push(u);
	}
	const hexes = html.match(/\b[a-fA-F0-9]{24}\b/g) || [];
	for (const id of hexes) if (/diskwala\.com\/(?:app|playlist|creator)\//i.test(html)) out.push(canonicalDiskwalaUrl(id));
	return unique(out);
}
async function fetchText$1(url, timeoutMs) {
	return (await fetch(url, {
		headers: {
			"user-agent": MEDIA_UA,
			accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"
		},
		redirect: "follow",
		signal: AbortSignal.timeout(timeoutMs)
	})).text();
}
async function scrapeTelegram(url) {
	const pages = telegramPages(url);
	const found = [];
	for (const page of pages.slice(0, 2)) try {
		const html = await fetchText$1(page, 8e3);
		found.push(...sharesFromHtml(html));
		if (found.length) break;
	} catch {}
	return unique(found);
}
function sharesFromPaste(text) {
	const known = extractUrlsFromText(text).filter(knownHost);
	if (known.length) return unique(known);
	const hex = text.match(/\b[a-fA-F0-9]{24}\b/);
	if (hex) return [canonicalDiskwalaUrl(hex[0])];
	const slug = text.match(/\b[A-Za-z0-9_-]{16}\b/);
	if (slug && /blatim/i.test(text)) return [canonicalBlatimUrl(slug[0])];
	return [];
}
/**
* Turn a messy Telegram paste, a t.me post, or a /v/ hop into real share URLs.
* Search uses the first share; Folder Pack can take every extracted share.
*/
async function expandPaste(raw, mode = "one") {
	const normalized = normalizePaste(raw);
	if (!normalized) return [];
	if (detectHost(normalized) === "telegram") {
		const nested = await scrapeTelegram(normalized);
		if (nested.length) return (mode === "one" ? nested.slice(0, 1) : nested.slice(0, MAX_SHARES)).map(firstMapped);
	}
	const fromText = sharesFromPaste(normalized);
	if (fromText.length > 1) {
		const mapped = fromText.map(firstMapped);
		return mode === "one" ? mapped.slice(0, 1) : mapped.slice(0, MAX_SHARES);
	}
	const seed = fromText[0] || normalized;
	const mapped = mapRedirector(seed);
	const urls = mapped.length ? mapped : [seed];
	return mode === "one" ? urls.slice(0, 1) : unique(urls).slice(0, MAX_SHARES);
}
function firstMapped(url) {
	return mapRedirector(url)[0] || url;
}
var rows = /* @__PURE__ */ new Map();
var REFRESH_MS = 6e5;
var refreshing = null;
var lastRefresh = 0;
var userDepth = 0;
var kickTimer = null;
var ALLOWED = /* @__PURE__ */ new Set([
	"https://www.teraboxdl.site",
	"https://www.diskwala.com",
	"https://www.blatim.com"
]);
var surface = {
	proxyPath: "/api/proxy",
	teraboxScripts: "",
	diskwalaBundle: "",
	diskwalaApi: "https://ddudapidd.diskwala.com/api/v1/",
	diskwalaSigned: true,
	blatimBundle: "",
	canWalkFolders: true,
	summary: "Skipper rechecks the public pages these hosts ship and prefers the path that last answered. One link lists that public share only — never a private account.",
	learnedAt: 0
};
function key(host, strategy) {
	return `${host}:${strategy}`;
}
function enterUser() {
	userDepth += 1;
}
function leaveUser() {
	userDepth = Math.max(0, userDepth - 1);
}
function userBusy() {
	return userDepth > 0;
}
/** Path their own site last published. Only /api/… we already trust. */
function learnedProxyPath() {
	return surface.proxyPath;
}
/** True while their published client still asks the worker for folder dir + page. */
function learnedFolderWalk() {
	return surface.canWalkFolders;
}
function record(host, strategy, ok, ms, note = "") {
	const row = rows.get(key(host, strategy)) ?? {
		ok: 0,
		fail: 0,
		lastOk: 0,
		lastFail: 0,
		ms: 0,
		note: ""
	};
	if (ok) {
		row.ok += 1;
		row.lastOk = Date.now();
		row.ms = ms;
	} else {
		row.fail += 1;
		row.lastFail = Date.now();
	}
	row.note = note.slice(0, 160);
	rows.set(key(host, strategy), row);
}
function rank(host, strategy, index) {
	let s = (20 - index) * 10;
	const row = rows.get(key(host, strategy));
	if (!row) return s;
	const now = Date.now();
	const recentOk = row.lastOk > 0 && row.lastOk >= row.lastFail && now - row.lastOk < 9e5;
	const recentFail = row.lastFail > row.lastOk && now - row.lastFail < 6e5;
	if (recentOk) s += 40;
	if (recentOk && row.ms > 0 && row.ms < 2e3) s += 8;
	if (recentFail) s -= 70;
	return s;
}
function orderByHealth(host, list) {
	return list.map((item, index) => ({
		item,
		index,
		s: rank(host, item.name, index)
	})).sort((a, b) => b.s - a.s || a.index - b.index).map((row) => row.item);
}
function pulse(host, strategy, fallback) {
	const row = rows.get(key(host, strategy));
	if (!row || !row.lastOk && !row.lastFail) return {
		host,
		state: "unknown",
		strategy,
		latencyMs: 0,
		note: fallback,
		checkedAt: 0
	};
	return {
		host,
		state: !(row.lastOk > row.lastFail) ? "down" : row.ms > 6e3 ? "slow" : "live",
		strategy,
		latencyMs: row.ms,
		note: row.note || fallback,
		checkedAt: Math.max(row.lastOk, row.lastFail)
	};
}
function snapshot() {
	return [
		pulse("terabox", "teraboxdl.site", `Public worker ${surface.proxyPath} on teraboxdl.site. Not checked this session yet.`),
		pulse("diskwala", "teraboxdl.site", surface.diskwalaSigned ? "Diskwala’s own API is still AppiCrypt-signed, so originals only come from the public worker — often down." : "Diskwala published an unsigned API. Skipper will try the worker first."),
		pulse("blatim", "blatim-info", "Public watch info. Not checked this session yet.")
	];
}
function statusPayload() {
	const hosts = snapshot();
	return {
		ok: true,
		hosts,
		summary: surface.summary,
		checkedAt: surface.learnedAt || hosts.reduce((max, h) => Math.max(max, h.checkedAt), 0),
		learning: Boolean(refreshing),
		busy: userBusy()
	};
}
async function readCapped(url, timeoutMs, maxBytes) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (!ALLOWED.has(parsed.origin)) return null;
	if (parsed.pathname.includes("..")) return null;
	try {
		const res = await fetch(parsed, {
			headers: {
				"user-agent": MEDIA_UA,
				accept: "*/*"
			},
			redirect: "follow",
			signal: AbortSignal.timeout(timeoutMs)
		});
		if (!ALLOWED.has(new URL(res.url).origin)) return null;
		const reader = res.body?.getReader();
		if (!reader) return {
			finalUrl: res.url,
			text: (await res.text()).slice(0, maxBytes)
		};
		const chunks = [];
		let size = 0;
		while (size < maxBytes) {
			const { done, value } = await reader.read();
			if (done || !value) break;
			chunks.push(value);
			size += value.byteLength;
		}
		try {
			await reader.cancel();
		} catch {}
		const text = new TextDecoder().decode(concat(chunks));
		return {
			finalUrl: res.url,
			text: text.slice(0, maxBytes)
		};
	} catch {
		return null;
	}
}
function concat(chunks) {
	const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
	let o = 0;
	for (const c of chunks) {
		out.set(c, o);
		o += c.byteLength;
	}
	return out;
}
function safePath(raw) {
	if (!/^\/api\/[a-z0-9/_-]{1,48}$/i.test(raw)) return null;
	if (!/proxy|extract|download/i.test(raw)) return null;
	return raw;
}
async function learnSurfaces() {
	if (userBusy()) return;
	const home = await readCapped("https://www.teraboxdl.site/", 8e3, 18e4);
	if (home && !userBusy()) {
		const scripts = [...new Set([...home.text.matchAll(/\/_next\/static\/chunks\/[^"'\\\s>]+\.js/g)].map((m) => m[0]))].filter((p) => p.startsWith("/_next/") && !p.includes(".."));
		const scriptKey = scripts.join("|");
		if (scriptKey && scriptKey !== surface.teraboxScripts) {
			let found = surface.proxyPath;
			const interesting = scripts.filter((p) => !/webpack|main-app|framework|polyfill/i.test(p)).slice(0, 8);
			for (const path of interesting) {
				if (userBusy()) break;
				const js = await readCapped(`https://www.teraboxdl.site${path}`, 8e3, 22e4);
				const hit = js?.text.match(/["'`](\/api\/[a-z0-9/_-]{2,48})["'`]/i)?.[1];
				const safe = hit ? safePath(hit) : null;
				if (safe && js) {
					found = safe;
					if (/f\.dir\s*=/.test(js.text) && /f\.page\s*=/.test(js.text)) surface.canWalkFolders = true;
					else if (/has_more/.test(js.text) && /lazy_folder/.test(js.text) && !/f\.dir\s*=/.test(js.text)) surface.canWalkFolders = false;
					break;
				}
			}
			surface.teraboxScripts = scriptKey;
			if (found !== surface.proxyPath) surface.proxyPath = found;
		}
	}
	if (userBusy()) return;
	const bundle = (await readCapped("https://www.diskwala.com/", 8e3, 2e4))?.text.match(/\/static\/js\/main\.[a-z0-9]+\.js/i)?.[0] || "";
	if (bundle && bundle !== surface.diskwalaBundle && !userBusy()) {
		const js = await readCapped(`https://www.diskwala.com${bundle}`, 1e4, 75e4);
		if (js) {
			const api = js.text.match(/https:\/\/[a-z0-9.-]+\.diskwala\.com\/api\/v1\//i)?.[0];
			if (api) surface.diskwalaApi = api;
			surface.diskwalaSigned = /appicrypt/i.test(js.text);
			surface.diskwalaBundle = bundle;
		}
	}
	if (userBusy()) return;
	const blBundle = (await readCapped("https://www.blatim.com/watch/lnGRKC5SxCbIy6yW", 8e3, 2e4))?.text.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)?.[0] || "";
	if (blBundle && blBundle !== surface.blatimBundle && !userBusy()) {
		const js = await readCapped(`https://www.blatim.com${blBundle}`, 8e3, 2e5);
		surface.blatimBundle = blBundle;
		if (js && !/\/api\/video\//.test(js.text) && !js.text.includes("/api/video")) surface.summary = "Blatim shipped a new page bundle that no longer mentions /api/video. Watch info is still tried directly.";
	}
	const when = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16).replace("T", " ");
	surface.summary = `${surface.proxyPath === "/api/proxy" ? "TeraBox worker is still POST /api/proxy." : `TeraBox worker moved to ${surface.proxyPath} — Skipper follows that.`} ${surface.canWalkFolders ? "Folder Pack still pages that public share." : "Their client stopped sending folder pages — Pack lists the first page only."} ${surface.diskwalaSigned ? "Diskwala still signs its API, so originals only come from the public worker." : "Diskwala’s bundle no longer looks signed."} Checked ${when} UTC. One link lists that public share, not a private account.`;
	surface.learnedAt = Date.now();
}
async function probeJson(url, init, timeoutMs) {
	const started = Date.now();
	try {
		const res = await fetch(url, {
			...init,
			signal: AbortSignal.timeout(timeoutMs)
		});
		const text = await res.text();
		const ms = Date.now() - started;
		try {
			const json = JSON.parse(text);
			if (json.errno === 0 || json.videoId || json.success === true || json.direct_link) return {
				ok: true,
				ms,
				note: "answering"
			};
			return {
				ok: false,
				ms,
				note: String(json.error || json.detail || json.errmsg || res.status).slice(0, 120)
			};
		} catch {
			return {
				ok: res.ok,
				ms,
				note: String(res.status)
			};
		}
	} catch (err) {
		return {
			ok: false,
			ms: Date.now() - started,
			note: err instanceof Error ? err.message : "probe failed"
		};
	}
}
async function probeAll() {
	if (userBusy()) return {
		pulses: snapshot(),
		done: false
	};
	await learnSurfaces();
	if (userBusy()) return {
		pulses: snapshot(),
		done: false
	};
	const headers = {
		"user-agent": MEDIA_UA,
		accept: "application/json",
		"content-type": "application/json",
		origin: "https://www.teraboxdl.site",
		referer: "https://www.teraboxdl.site/"
	};
	const terabox = await probeJson(`https://www.teraboxdl.site${surface.proxyPath}`, {
		method: "POST",
		headers,
		body: JSON.stringify({ url: "https://1024terabox.com/s/1Q_R1bPVDax-6zXT9koAc4A" })
	}, 1e4);
	record("terabox", "teraboxdl.site", terabox.ok, terabox.ms, terabox.ok ? `Original file via ${surface.proxyPath}.` : terabox.note);
	if (userBusy()) return {
		pulses: snapshot(),
		done: false
	};
	const diskwala = await probeJson(`https://www.teraboxdl.site${surface.proxyPath}`, {
		method: "POST",
		headers,
		body: JSON.stringify({ url: "https://www.diskwala.com/app/6ab3fbfd2a52418b24e638cd" })
	}, 8e3);
	record("diskwala", "teraboxdl.site", diskwala.ok, diskwala.ms, diskwala.ok ? "Diskwala original answered." : diskwala.note);
	if (userBusy()) return {
		pulses: snapshot(),
		done: false
	};
	const blatim = await probeJson("https://www.blatim.com/api/video/lnGRKC5SxCbIy6yW/info", { headers: {
		"user-agent": MEDIA_UA,
		accept: "application/json",
		origin: "https://www.blatim.com",
		referer: "https://www.blatim.com/"
	} }, 8e3);
	record("blatim", "blatim-info", blatim.ok, blatim.ms, blatim.ok ? "Watch info is public." : blatim.note);
	return {
		pulses: snapshot(),
		done: true
	};
}
function refreshHealth(force = false) {
	if (userBusy() && !force) return Promise.resolve(snapshot());
	if (refreshing) return refreshing;
	if (!force && lastRefresh && Date.now() - lastRefresh < REFRESH_MS) return Promise.resolve(snapshot());
	refreshing = probeAll().then((result) => {
		if (result.done) lastRefresh = Date.now();
		return result.pulses;
	}).finally(() => {
		refreshing = null;
	});
	return refreshing;
}
/** Start a check only when nobody is opening a link. Never blocks the caller. */
function kickRefresh() {
	if (refreshing || kickTimer) return;
	if (lastRefresh && Date.now() - lastRefresh < REFRESH_MS) return;
	kickTimer = setTimeout(() => {
		kickTimer = null;
		if (userBusy()) {
			kickRefresh();
			return;
		}
		refreshHealth(false);
	}, 12e3);
}
/**
* No-login original file via public resolvers that keep their own cookie pool.
* Proven 2026-09-23 / still live 2026-10: POST https://www.teraboxdl.site/api/proxy
*   TeraBox  → dl-worker.teraboxdl.site?token=…  (video/mp4, Range 206, CORS *)
*   Diskwala → cdns*.diskwala.com / S3 when the worker still answers
* Sequential www → apex (never race — parallel POSTs rate-limit the first paste).
*/
var ROBIN = {
	name: "robin-worker",
	url: "https://terabox-worker.robinkumarshakya103.workers.dev/api",
	origin: "https://terabox-worker.robinkumarshakya103.workers.dev",
	method: "GET",
	timeoutMs: 7e3
};
function teraboxResolvers() {
	const path = learnedProxyPath();
	const list = [{
		name: "teraboxdl.site",
		url: `https://www.teraboxdl.site${path}`,
		origin: "https://www.teraboxdl.site",
		method: "POST",
		timeoutMs: 12e3
	}];
	if (path !== "/api/proxy") list.push({
		name: "teraboxdl.site-legacy",
		url: "https://www.teraboxdl.site/api/proxy",
		origin: "https://www.teraboxdl.site",
		method: "POST",
		timeoutMs: 12e3
	});
	list.push({
		name: "teraboxdl.site-apex",
		url: `https://teraboxdl.site${path}`,
		origin: "https://teraboxdl.site",
		method: "POST",
		timeoutMs: 12e3
	});
	list.push(ROBIN);
	return list;
}
function diskwalaResolvers() {
	const path = learnedProxyPath();
	return [{
		name: "teraboxdl.site",
		url: `https://www.teraboxdl.site${path}`,
		origin: "https://www.teraboxdl.site",
		method: "POST",
		timeoutMs: 8e3
	}, {
		name: "teraboxdl.site-apex",
		url: `https://teraboxdl.site${path}`,
		origin: "https://teraboxdl.site",
		method: "POST",
		timeoutMs: 8e3
	}];
}
var CACHE_TTL_MS = 45e3;
var cache = /* @__PURE__ */ new Map();
function asHttp(u) {
	return typeof u === "string" && /^https?:\/\//i.test(u) ? u : void 0;
}
function isSharePage(url) {
	try {
		const u = new URL(url);
		const path = u.pathname.toLowerCase();
		if (/\.(mp4|mkv|webm|mov|m4v|mp3|m3u8|ts)(\?|$)/i.test(path) || u.searchParams.has("token")) return false;
		return /\/(s|sharing|app|playlist|creator|watch)\b/i.test(path);
	} catch {
		return true;
	}
}
function pickHls(it) {
	return [
		it.m3u8,
		it.m3u8_url,
		it.hls,
		it.hls_url,
		it.master_m3u8,
		it.stream_url,
		it.streaming_url
	].find((u) => typeof u === "string" && /^https?:\/\//i.test(u) && /m3u8|mpegurl|get_m3u8/i.test(u));
}
function pickDirect(it) {
	for (const k of [
		"direct_link",
		"download_link",
		"dlink",
		"original_download_url",
		"download_url",
		"stream_download_url",
		"cdn_url",
		"play_url",
		"video_url",
		"url"
	]) {
		const u = asHttp(it[k]);
		if (u && !isSharePage(u)) return u;
	}
	const stream = asHttp(it.stream_url);
	if (stream && !/m3u8|mpegurl|get_m3u8/i.test(stream) && !isSharePage(stream)) return stream;
}
function parseSize(raw) {
	const n = Number(raw);
	if (Number.isFinite(n) && n > 0) return n;
	if (typeof raw === "string") {
		const m = raw.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
		if (m) {
			const v = Number(m[1]);
			const u = m[2].toUpperCase();
			if (u === "GB") return Math.round(v * 1e9);
			if (u === "MB") return Math.round(v * 1e6);
			if (u === "KB") return Math.round(v * 1e3);
			return Math.round(v);
		}
	}
	return 0;
}
function fromProxyItem(it, json) {
	const name = String(it.server_filename || it.filename || it.file_name || it.name || it.title || json.title || "");
	const directUrl = pickDirect(it);
	if (!name && !directUrl) return null;
	if (Number(it.isdir) === 1 || it.is_dir === true) return null;
	const thumbs = it.thumbs ?? {};
	const size = parseSize(it.size ?? it.size_bytes ?? it.sizebytes ?? it.file_size);
	return {
		name: name || "file",
		size,
		fsId: it.fs_id != null ? String(it.fs_id) : it.fid != null ? String(it.fid) : it.file_id != null ? String(it.file_id) : void 0,
		shareId: json.share_id != null ? String(json.share_id) : json.shareid != null ? String(json.shareid) : it.shareid != null ? String(it.shareid) : void 0,
		uk: json.uk != null ? String(json.uk) : it.uk != null ? String(it.uk) : void 0,
		thumbnail: thumbs.url3 || thumbs.url2 || thumbs.url1 || asHttp(it.thumbnail) || asHttp(it.thumb),
		duration: it.duration != null ? Number(it.duration) : void 0,
		directUrl,
		hlsUrl: pickHls(it),
		md5: typeof it.md5 === "string" ? it.md5 : void 0
	};
}
function unwrapPayload(json) {
	const data = json.data;
	if (data && typeof data === "object" && !Array.isArray(data)) {
		const d = data;
		return {
			...json,
			...d,
			data: json.data
		};
	}
	return json;
}
function filesFromJson(json) {
	const payload = unwrapPayload(json);
	const rawUnknown = payload.list ?? payload.files ?? payload.fileInfo ?? payload.file_info ?? payload.data ?? payload.result;
	return (Array.isArray(rawUnknown) ? rawUnknown : rawUnknown && typeof rawUnknown === "object" ? [rawUnknown] : payload.direct_link || payload.dlink || payload.url ? [payload] : []).map((it) => fromProxyItem(it, payload)).filter((f) => Boolean(f));
}
async function callResolver(r, shareUrl, extra) {
	const target = r.method === "GET" ? `${r.url}?url=${encodeURIComponent(shareUrl)}` : r.url;
	const body = {
		url: shareUrl,
		link: shareUrl
	};
	if (extra?.dir) body.dir = extra.dir;
	if (extra?.page && extra.page > 1) body.page = extra.page;
	const res = await fetch(target, {
		method: r.method,
		headers: {
			"user-agent": MEDIA_UA,
			accept: "application/json",
			origin: r.origin,
			referer: `${r.origin}/`,
			...r.method === "POST" ? { "content-type": "application/json" } : {}
		},
		body: r.method === "POST" ? JSON.stringify(body) : void 0,
		signal: AbortSignal.timeout(r.timeoutMs ?? 18e3)
	});
	const text = await res.text();
	let json;
	try {
		json = JSON.parse(text);
	} catch {
		return { error: `${r.name} returned non-JSON (${res.status}).` };
	}
	const errno = typeof json.errno === "number" ? json.errno : void 0;
	const detail = json.detail;
	if (!res.ok || errno !== void 0 && errno !== 0 || json.error || json.success === false || typeof detail === "string" && /not found/i.test(detail)) return { error: String(json.error || json.errmsg || json.detail || `${r.name} errno ${json.errno ?? res.status}`) };
	return { json };
}
async function tryResolver(r, shareUrl) {
	const got = await callResolver(r, shareUrl);
	if ("error" in got) throw new Error(got.error);
	const files = filesFromJson(got.json);
	if (!files.length) throw new Error(`${r.name} listed no files.`);
	if (!files.some((f) => f.directUrl || f.hlsUrl)) throw new Error(`${r.name} listed files but no media URL.`);
	return {
		ok: true,
		title: String(got.json.title || files[0].name).replace(/^\/+/, ""),
		files,
		source: r.name
	};
}
function candidateUrls(shareUrl, kind) {
	if (kind === "diskwala") return [shareUrl];
	return teraboxCandidateUrls(shareUrl);
}
async function resolveTeraboxPublic(shareUrl, opts = {}) {
	const kind = opts.kind ?? "terabox";
	const cacheKey = `${kind}:${shareUrl.trim()}`;
	const hit = cache.get(cacheKey);
	if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
	const list = orderByHealth(kind, kind === "diskwala" ? diskwalaResolvers() : teraboxResolvers());
	const urls = candidateUrls(shareUrl, kind);
	let lastError = "No public resolver answered.";
	for (const url of urls) for (const r of list) {
		const started = Date.now();
		try {
			const ok = await tryResolver(r, url);
			record(kind, r.name, true, Date.now() - started, ok.title);
			cache.set(cacheKey, {
				at: Date.now(),
				value: ok
			});
			return ok;
		} catch (err) {
			lastError = err instanceof Error ? err.message : String(err);
			record(kind, r.name, false, Date.now() - started, lastError);
		}
	}
	return {
		ok: false,
		error: lastError
	};
}
function listingFromJson(json) {
	const payload = unwrapPayload(json);
	const rawUnknown = payload.list ?? payload.files ?? payload.fileInfo ?? payload.file_info ?? payload.data ?? payload.result;
	const raw = Array.isArray(rawUnknown) ? rawUnknown : rawUnknown && typeof rawUnknown === "object" ? [rawUnknown] : [];
	const folders = [];
	const fileItems = [];
	for (const it of raw) {
		if (Number(it.isdir) === 1 || it.is_dir === true) {
			const path = typeof it.path === "string" ? it.path : "";
			if (path && path !== "/") folders.push(path);
			continue;
		}
		fileItems.push(it);
	}
	const files = fileItems.map((it) => fromProxyItem(it, payload)).filter((f) => Boolean(f));
	return {
		title: String(payload.title || files[0]?.name || "TeraBox share").replace(/^\/+/, ""),
		files,
		folders,
		hasMore: payload.has_more === true
	};
}
/**
* Folder Pack only. Pages the public share the worker actually publishes
* (`dir` + `page` + `has_more`). Never asks for a parent folder — a bad dir
* comes back as "expired" and must not wipe the root listing. A private
* account is not listable from one share.
*/
async function walkTeraboxPublic(shareUrl) {
	if (!learnedFolderWalk()) return resolveTeraboxPublic(shareUrl, { kind: "terabox" });
	const started = Date.now();
	const MAX_FILES = 60;
	const MAX_DIRS = 12;
	const MAX_PAGES = 4;
	const MAX_MS = 16e3;
	const resolvers = orderByHealth("terabox", teraboxResolvers()).filter((r) => r.method === "POST");
	const urls = teraboxCandidateUrls(shareUrl);
	let lastError = "No public resolver answered.";
	let root = null;
	for (const url of urls) {
		for (const r of resolvers) {
			const t0 = Date.now();
			const got = await callResolver(r, url);
			if ("error" in got) {
				lastError = got.error;
				record("terabox", r.name, false, Date.now() - t0, lastError);
				continue;
			}
			const listing = listingFromJson(got.json);
			if (!listing.files.some((f) => f.directUrl || f.hlsUrl) && !listing.folders.length) {
				lastError = `${r.name} listed no playable files.`;
				record("terabox", r.name, false, Date.now() - t0, lastError);
				continue;
			}
			record("terabox", r.name, true, Date.now() - t0, listing.title);
			root = {
				r,
				url,
				listing
			};
			break;
		}
		if (root) break;
	}
	if (!root) return {
		ok: false,
		error: lastError
	};
	const files = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (list) => {
		for (const f of list) {
			if (!f.directUrl && !f.hlsUrl) continue;
			if (files.length >= MAX_FILES) return;
			const key = f.fsId || f.directUrl || f.hlsUrl || `${f.name}:${f.size}`;
			if (seen.has(key)) continue;
			seen.add(key);
			files.push(f);
		}
	};
	add(root.listing.files);
	let truncated = files.length >= MAX_FILES;
	const queue = [];
	const seenDirs = /* @__PURE__ */ new Set();
	const enqueue = (dirs, depth) => {
		if (depth > 3) return;
		for (const dir of dirs) {
			if (!dir || seenDirs.has(dir) || queue.length >= MAX_DIRS) continue;
			queue.push({
				dir,
				depth
			});
		}
	};
	enqueue(root.listing.folders, 1);
	let page = 1;
	let more = root.listing.hasMore;
	while (more && page < MAX_PAGES && files.length < MAX_FILES && Date.now() - started < MAX_MS) {
		page += 1;
		const got = await callResolver(root.r, root.url, { page });
		if ("error" in got) {
			truncated = true;
			break;
		}
		const listing = listingFromJson(got.json);
		add(listing.files);
		enqueue(listing.folders, 1);
		more = listing.hasMore && (listing.files.length > 0 || listing.folders.length > 0);
	}
	if (more) truncated = true;
	let dirs = 0;
	while (queue.length && dirs < MAX_DIRS && files.length < MAX_FILES && Date.now() - started < MAX_MS) {
		const job = queue.shift();
		if (!job || seenDirs.has(job.dir)) continue;
		seenDirs.add(job.dir);
		dirs += 1;
		let folderPage = 1;
		let folderMore = true;
		while (folderMore && folderPage <= MAX_PAGES && files.length < MAX_FILES && Date.now() - started < MAX_MS) {
			const got = await callResolver(root.r, root.url, {
				dir: job.dir,
				page: folderPage
			});
			if ("error" in got) {
				truncated = true;
				break;
			}
			const listing = listingFromJson(got.json);
			add(listing.files);
			enqueue(listing.folders, job.depth + 1);
			folderMore = listing.hasMore && (listing.files.length > 0 || listing.folders.length > 0);
			if (!folderMore) break;
			folderPage += 1;
		}
		if (folderMore) truncated = true;
	}
	if ((queue.length || more) && files.length >= MAX_FILES) truncated = true;
	if (!files.length) return {
		ok: false,
		error: lastError
	};
	return {
		ok: true,
		title: root.listing.title || files[0].name,
		files,
		source: root.r.name,
		truncated
	};
}
var TTL_MS = 15e5;
var store = /* @__PURE__ */ new Map();
var packs = /* @__PURE__ */ new Map();
var segmentAllow = /* @__PURE__ */ new Map();
function gc() {
	const now = Date.now();
	for (const [k, v] of store) if (v.expires < now) {
		store.delete(k);
		segmentAllow.delete(k);
	}
	for (const [k, v] of packs) if (v.expires < now) packs.delete(k);
}
function putMedia(entry) {
	gc();
	const id = randomBytes(12).toString("hex");
	store.set(id, {
		...entry,
		expires: Date.now() + TTL_MS
	});
	return id;
}
function getMedia(id) {
	const row = store.get(id);
	if (!row || row.expires < Date.now()) {
		store.delete(id);
		segmentAllow.delete(id);
		return null;
	}
	return row;
}
function putPack(title, files) {
	gc();
	const id = randomBytes(12).toString("hex");
	packs.set(id, {
		title,
		files,
		expires: Date.now() + TTL_MS
	});
	return id;
}
function getPack(id) {
	const row = packs.get(id);
	if (!row || row.expires < Date.now()) {
		packs.delete(id);
		return null;
	}
	return row;
}
function allowSegments(id, urls) {
	let set = segmentAllow.get(id);
	if (!set) {
		set = /* @__PURE__ */ new Set();
		segmentAllow.set(id, set);
	}
	for (const url of urls) {
		if (set.size >= 4e3) break;
		set.add(url);
	}
}
function segmentAllowed(id, url) {
	return segmentAllow.get(id)?.has(url) ?? false;
}
function refererFor(url, fallback) {
	try {
		const h = new URL(url).hostname.toLowerCase();
		if (h.endsWith("teraboxdl.site")) return "https://www.teraboxdl.site/";
		if (h.endsWith("diskwala.com") || h.endsWith("revwala.com") || h.endsWith("diskwala-fast-edge.net") || h.endsWith("dw2in.com") || h.includes("amazonaws")) return "https://www.diskwala.com/";
		if (h.endsWith("blatim.com") || h.endsWith("supabase.co") || h.endsWith("vidbunker.in") || h.endsWith("vidbunker.com")) return "https://www.blatim.com/";
		if (h.includes("terabox") || h.includes("1024tera") || h.includes("freeterabox") || h.includes("4funbox") || h.includes("nephobox") || h.includes("mirrobox") || h.includes("momerybox") || h.includes("tibibox")) return "https://www.1024tera.com/";
	} catch {}
	return fallback;
}
var APP_ID = "250528";
var ORIGINS = [
	"https://www.1024tera.com",
	"https://www.terabox.app",
	"https://www.terabox.com"
];
var HLS_TYPES = [
	"M3U8_AUTO_720",
	"M3U8_AUTO_480",
	"M3U8_FLV_264_480",
	"M3U8_AUTO_360",
	"M3U8_FLV_264_360"
];
function cookieHeaderFromResponse(res) {
	return (typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : []).map((c) => c.split(";")[0]).filter(Boolean).join("; ");
}
function mergeCookie(a, b) {
	const map = /* @__PURE__ */ new Map();
	for (const part of `${a}; ${b}`.split(";")) {
		const trimmed = part.trim();
		if (!trimmed || !trimmed.includes("=")) continue;
		const eq = trimmed.indexOf("=");
		map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
	}
	return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function extractJsToken(html) {
	const encoded = html.match(/fn%28%22([A-F0-9]{32,})%22/);
	if (encoded?.[1]) return encoded[1];
	const plain = html.match(/fn\("([A-F0-9]{32,})"\)/);
	if (plain?.[1]) return plain[1];
	const assigned = html.match(/jsToken["'\s:=]+["']([A-F0-9]{32,})/);
	if (assigned?.[1]) return assigned[1];
	const snippet = html.match(/decodeURIComponent\(`([^`]+)`\)/);
	if (snippet?.[1]) try {
		const m = decodeURIComponent(snippet[1]).match(/fn\("([A-F0-9]{32,})"\)/);
		if (m?.[1]) return m[1];
	} catch {}
	return "";
}
function extractPcfToken(html) {
	return html.match(/"pcftoken"\s*:\s*"([^"]+)"/)?.[1] ?? "";
}
async function fetchText(url, init = {}) {
	const res = await fetch(url, {
		method: init.method ?? "GET",
		headers: {
			"user-agent": MEDIA_UA,
			accept: "application/json,text/html,*/*",
			referer: init.referer ?? `${ORIGINS[0]}/`,
			cookie: init.cookie ?? "",
			...init.body ? { "content-type": "application/x-www-form-urlencoded" } : {}
		},
		body: init.body,
		redirect: "follow",
		signal: AbortSignal.timeout(15e3)
	});
	const text = await res.text();
	let json = null;
	try {
		json = JSON.parse(text);
	} catch {
		json = null;
	}
	return {
		status: res.status,
		text,
		cookie: cookieHeaderFromResponse(res),
		json
	};
}
function mimeHint$3(name, isDir, category) {
	if (isDir) return "folder";
	if (category === "1") return "video";
	if (category === "2") return "audio";
	if (category === "3") return "image";
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if ([
		"mp4",
		"mkv",
		"avi",
		"mov",
		"webm",
		"flv",
		"m4v",
		"ts"
	].includes(ext)) return "video";
	if ([
		"mp3",
		"flac",
		"wav",
		"aac",
		"m4a",
		"ogg"
	].includes(ext)) return "audio";
	if ([
		"jpg",
		"jpeg",
		"png",
		"gif",
		"webp",
		"bmp"
	].includes(ext)) return "image";
	return "file";
}
function attachMedia(file) {
	if (file.directUrl || file.hlsUrl) file.mediaId = putMedia({
		name: file.name,
		directUrl: file.directUrl,
		hlsUrl: file.hlsUrl,
		referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.teraboxdl.site/")
	});
	return file;
}
function toFile(item, ctx) {
	const isDir = String(item.isdir) === "1";
	const name = item.server_filename || item.path.split("/").pop() || "file";
	const hint = mimeHint$3(name, isDir, item.category);
	return {
		id: String(item.fs_id),
		name,
		size: Number(item.size) || 0,
		isDir,
		path: item.path,
		mimeHint: hint,
		thumbnail: item.thumbs?.url3 || item.thumbs?.url2 || item.thumbs?.url1,
		duration: item.duration ? Number(item.duration) : void 0,
		width: item.width,
		height: item.height,
		md5: item.md5,
		fsId: String(item.fs_id),
		shareId: ctx.shareId,
		uk: ctx.uk,
		surl: ctx.surl,
		shareSign: ctx.shareSign,
		shareTimestamp: ctx.shareTimestamp,
		host: "terabox",
		directUrl: item.dlink || void 0,
		hlsUrl: void 0,
		originalReady: Boolean(item.dlink),
		canStream: !isDir && (hint === "video" || hint === "audio")
	};
}
function asList(json) {
	if (!json || typeof json !== "object") return null;
	const row = json;
	if (typeof row.errno === "number" && row.errno !== 0) return null;
	if (!Array.isArray(row.list) || !row.list.length) return null;
	if (row.share_id == null && row.shareid != null) row.share_id = row.shareid;
	if (row.uk == null && row.uk_str != null) row.uk = row.uk_str;
	return row;
}
function listParams(surl, extra = {}) {
	return new URLSearchParams({
		app_id: APP_ID,
		shorturl: surl,
		root: extra.dir ? "0" : "1",
		scene: "",
		web: "1",
		page: "1",
		num: "100",
		channel: "dubox",
		clienttype: "0",
		...extra
	});
}
async function listDir(origin, surl, cookie, jsToken, pcfToken, dir, page = 1) {
	const u = new URL(`${origin}/share/list`);
	u.search = listParams(surl, {
		...dir ? {
			dir,
			root: "0"
		} : {},
		...jsToken ? { jsToken } : {},
		...pcfToken ? { pcftoken: pcfToken } : {},
		page: String(page)
	}).toString();
	const { json } = await fetchText(u.toString(), {
		cookie,
		referer: `${origin}/sharing/link?surl=${surl}`
	});
	return json ?? { errno: -1 };
}
async function listPages(origin, surl, cookie, jsToken, pcfToken, dir) {
	const out = [];
	for (let page = 1; page <= 3; page++) {
		const listed = await listDir(origin, surl, cookie, jsToken, pcfToken, dir, page);
		if (listed.errno !== 0 || !listed.list?.length) break;
		out.push(...listed.list);
		if (listed.list.length < 100) break;
	}
	return out;
}
async function shortUrlInfo(origin, surl, cookie, jsToken) {
	const variants = [surl, /^1[\w-]/.test(surl) ? surl.slice(1) : `1${surl}`];
	for (const shorturl of variants) {
		const u = new URL(`${origin}/api/shorturlinfo`);
		u.search = listParams(shorturl, { ...jsToken ? { jsToken } : {} }).toString();
		const { json } = await fetchText(u.toString(), {
			cookie,
			referer: `${origin}/sharing/link?surl=${surl.replace(/^1/, "")}`
		});
		const list = asList(json);
		if (list) return list;
	}
	return { errno: -1 };
}
async function expandFolders(origin, surl, cookie, jsToken, pcfToken, items, depth = 0) {
	const MAX_FILES = 60;
	const out = [];
	for (const item of items) {
		if (out.length >= MAX_FILES) break;
		if (String(item.isdir) === "1" && depth < 3) try {
			const nested = await listPages(origin, surl, cookie, jsToken, pcfToken, item.path);
			if (nested.length) {
				const kids = await expandFolders(origin, surl, cookie, jsToken, pcfToken, nested, depth + 1);
				out.push(...kids);
			}
		} catch {}
		else out.push(item);
	}
	return out.slice(0, MAX_FILES);
}
function parentDir(path) {
	const parts = path.split("/").filter(Boolean);
	if (parts.length < 2) return "";
	parts.pop();
	return `/${parts.join("/")}`;
}
/** If the link opens one file inside a shared folder, list that folder too. */
async function widenShare(origin, surl, cookie, jsToken, pcfToken, items) {
	if (items.length !== 1 || String(items[0].isdir) === "1") return items;
	const parent = parentDir(items[0].path || "");
	if (!parent) return items;
	try {
		const sibs = await listPages(origin, surl, cookie, jsToken, pcfToken, parent);
		if (sibs.length > 1) return sibs;
	} catch {}
	return items;
}
async function openOrigin(origin, surl, extraCookie) {
	const page = await fetchText(`${origin}/sharing/link?surl=${surl}`, {
		cookie: extraCookie,
		referer: `${origin}/`
	});
	const cookie = mergeCookie(page.cookie, extraCookie);
	const jsToken = extractJsToken(page.text);
	const pcfToken = extractPcfToken(page.text);
	const info = await shortUrlInfo(origin, surl, cookie, jsToken);
	if (info.errno === 0 && info.list?.length) {
		const items = await expandFolders(origin, surl, cookie, jsToken, pcfToken, await widenShare(origin, surl, cookie, jsToken, pcfToken, info.list));
		return {
			list: {
				...info,
				list: items
			},
			cookie,
			jsToken,
			origin
		};
	}
	const listed = await listDir(origin, surl, cookie, jsToken, pcfToken);
	if (listed.errno === 0 && listed.list?.length) {
		const items = await expandFolders(origin, surl, cookie, jsToken, pcfToken, await widenShare(origin, surl, cookie, jsToken, pcfToken, listed.list));
		return {
			list: {
				...listed,
				sign: listed.sign || info.sign,
				timestamp: listed.timestamp || info.timestamp,
				share_id: listed.share_id || listed.shareid || info.share_id || info.shareid,
				uk: listed.uk || info.uk,
				list: items
			},
			cookie,
			jsToken,
			origin
		};
	}
	const errno = listed.errno || info.errno || -1;
	const msg = listed.errmsg || listed.show_msg || info.errmsg || `errno ${errno}`;
	throw new Error(msg);
}
async function openNative(surl, extraCookie) {
	const errors = [];
	for (const origin of ORIGINS) try {
		return await Promise.race([openOrigin(origin, surl, extraCookie), new Promise((_, reject) => setTimeout(() => reject(/* @__PURE__ */ new Error("timeout")), 8e3))]);
	} catch (err) {
		errors.push(`${new URL(origin).host}: ${err instanceof Error ? err.message : String(err)}`);
	}
	throw new Error(errors.join(" · ") || "all TeraBox origins failed");
}
function teraboxStreamSign(uk, shareId, fid, timestamp) {
	return createHash("sha1").update(`${uk}${shareId}${fid}${timestamp}`).digest("hex");
}
function teraboxStreamUrl(file, type = "M3U8_AUTO_480", origin = ORIGINS[0]) {
	if (!file.uk || !file.shareId || !file.fsId) return null;
	const ts = file.shareTimestamp ? Number(file.shareTimestamp) : Math.floor(Date.now() / 1e3);
	const sign = file.shareSign || teraboxStreamSign(file.uk, file.shareId, file.fsId, Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1e3));
	const u = new URL(`${origin}/share/streaming`);
	u.searchParams.set("uk", file.uk);
	u.searchParams.set("shareid", file.shareId);
	u.searchParams.set("type", type);
	u.searchParams.set("fid", file.fsId);
	u.searchParams.set("sign", sign);
	u.searchParams.set("timestamp", String(Number.isFinite(ts) ? ts : Math.floor(Date.now() / 1e3)));
	u.searchParams.set("app_id", APP_ID);
	u.searchParams.set("channel", "dubox");
	u.searchParams.set("clienttype", "0");
	u.searchParams.set("web", "1");
	return u.toString();
}
async function fetchTeraboxPlaylist(uk, shareId, fid, type = "M3U8_AUTO_480", extra) {
	const types = [type, ...HLS_TYPES.filter((t) => t !== type)];
	for (const origin of ORIGINS) for (const t of types) {
		const streamUrl = teraboxStreamUrl({
			uk,
			shareId,
			fsId: fid,
			shareSign: extra?.shareSign,
			shareTimestamp: extra?.shareTimestamp
		}, t, origin);
		if (!streamUrl) continue;
		const { text, json } = await fetchText(streamUrl, { referer: `${origin}/` });
		if (typeof json === "object" && json && "errno" in json && json.errno !== 0) continue;
		if (text.includes("#EXTM3U")) return {
			playlist: text,
			streamUrl
		};
	}
	return { error: "No HLS playlist is available for this file yet (transcode pending or blocked)." };
}
async function fetchTeraboxDlink(opts) {
	if (!opts.cookie.includes("ndus=")) return null;
	const origin = opts.origin || ORIGINS[0];
	const sharedownload = async () => {
		const u = new URL(`${origin}/api/sharedownload`);
		u.searchParams.set("app_id", APP_ID);
		u.searchParams.set("channel", "dubox");
		u.searchParams.set("clienttype", "0");
		u.searchParams.set("web", "1");
		if (opts.jsToken) u.searchParams.set("jsToken", opts.jsToken);
		const body = new URLSearchParams({
			product: "share",
			uk: opts.uk,
			primaryid: opts.shareId,
			fid_list: JSON.stringify([Number(opts.fsId)])
		});
		const { json } = await fetchText(u.toString(), {
			method: "POST",
			body: body.toString(),
			cookie: opts.cookie,
			referer: `${origin}/`
		});
		const data = json;
		return data?.list?.[0]?.dlink ?? data?.dlink ?? null;
	};
	const shareDownload = async () => {
		if (!opts.sign || !opts.timestamp) return null;
		const u = new URL(`${origin}/share/download`);
		u.searchParams.set("app_id", APP_ID);
		u.searchParams.set("channel", "dubox");
		u.searchParams.set("clienttype", "0");
		u.searchParams.set("web", "1");
		u.searchParams.set("uk", opts.uk);
		u.searchParams.set("shareid", opts.shareId);
		u.searchParams.set("sign", opts.sign);
		u.searchParams.set("timestamp", opts.timestamp);
		if (opts.jsToken) u.searchParams.set("jsToken", opts.jsToken);
		const body = new URLSearchParams({
			product: "share",
			fid_list: JSON.stringify([Number(opts.fsId)]),
			primaryid: opts.shareId,
			uk: opts.uk
		});
		const { json } = await fetchText(u.toString(), {
			method: "POST",
			body: body.toString(),
			cookie: opts.cookie,
			referer: `${origin}/`
		});
		const data = json;
		return data?.list?.[0]?.dlink ?? data?.dlink ?? null;
	};
	return await sharedownload() || await shareDownload();
}
function hintForNativeError(message) {
	if (/400141|need verify/i.test(message)) return "TeraBox is asking the native page to verify. Skipper still tries the public original-file worker — paste again in a couple of seconds if this keeps failing.";
	if (/-9|password|pwd|extract/i.test(message)) return "This share looks password-protected. Skipper cannot open locked TeraBox folders yet.";
	if (/400210|login/i.test(message)) return "TeraBox rate-limited the anonymous session. The public worker usually still has the original file.";
	return message;
}
async function resolveTerabox(rawUrl, extraCookie = "") {
	const started = Date.now();
	const surl = extractTeraSurl(rawUrl);
	if (!surl) return {
		ok: false,
		host: "terabox",
		inputUrl: rawUrl,
		error: "Could not read a TeraBox share code from that URL.",
		hint: "Use a link like https://1024tera.com/s/…, https://teraboxshare.com/s/… or https://teraboxlinke.com/v/… — every 2026 mirror is accepted.",
		elapsedMs: Date.now() - started
	};
	const publicP = resolveTeraboxPublic(rawUrl, { kind: "terabox" });
	const nativeP = openNative(surl, extraCookie).then((v) => v, () => null);
	const pub = await publicP;
	let native = null;
	if (pub.ok) native = await Promise.race([nativeP, new Promise((resolve) => setTimeout(() => resolve(null), 2500))]);
	else native = await nativeP;
	const pubFail = pub.ok ? "" : pub.error;
	const list = native?.list && native.list.errno === 0 ? native.list : void 0;
	if (list?.list?.length) {
		const shareId = String(list.share_id ?? list.shareid ?? "");
		const uk = String(list.uk ?? list.uk_str ?? "");
		const shareSign = list.sign ? String(list.sign) : void 0;
		const shareTimestamp = list.timestamp != null ? String(list.timestamp) : void 0;
		const files = (list.list ?? []).map((it) => toFile(it, {
			shareId,
			uk,
			surl,
			shareSign,
			shareTimestamp
		}));
		if (extraCookie.includes("ndus=") && native) await Promise.all(files.filter((f) => !f.isDir && !f.directUrl).slice(0, 8).map(async (f) => {
			if (!f.fsId) return;
			const dlink = await fetchTeraboxDlink({
				uk,
				shareId,
				fsId: f.fsId,
				cookie: native.cookie,
				jsToken: native.jsToken,
				origin: native.origin,
				sign: shareSign,
				timestamp: shareTimestamp
			});
			if (dlink) {
				f.directUrl = dlink;
				f.originalReady = true;
				f.canStream = true;
			}
		}));
		if (pub.ok) for (const f of files) {
			const match = pub.files.find((p) => p.fsId && p.fsId === f.fsId) || pub.files.find((p) => p.name === f.name) || (pub.files.length === 1 ? pub.files[0] : void 0);
			if (!match) continue;
			if (match.directUrl) {
				f.directUrl = match.directUrl;
				f.originalReady = true;
			}
			if (match.hlsUrl) f.hlsUrl = match.hlsUrl;
			if (match.thumbnail && !f.thumbnail) f.thumbnail = match.thumbnail;
			if (match.duration && !f.duration) f.duration = match.duration;
			if (match.size && !f.size) f.size = match.size;
			f.canStream = f.canStream || Boolean(match.directUrl || match.hlsUrl);
		}
		for (const f of files) attachMedia(f);
		const warnings = [];
		if (files.some((f) => f.originalReady)) warnings.push(pub.ok ? `Original file is ready via ${pub.source} — Play streams the full upload, Download saves the original bytes.` : "Original file is ready from the TeraBox session.");
		else warnings.push(pubFail ? `Could not mint an original file URL (${pubFail}). Play may only have the official transcode.` : "Original file link is still warming up — Skipper will retry the public worker automatically.");
		return {
			ok: true,
			host: "terabox",
			inputUrl: rawUrl,
			title: (list.title || files[0]?.name || "TeraBox share").replace(/^\/+/, ""),
			files,
			warnings,
			usedCookie: extraCookie.includes("ndus="),
			elapsedMs: Date.now() - started,
			source: pub.ok ? pub.source : extraCookie.includes("ndus=") ? "ndus" : "shorturlinfo"
		};
	}
	if (pub.ok) {
		const files = pub.files.map((p) => attachMedia({
			id: p.fsId || p.name,
			name: p.name,
			size: p.size,
			isDir: false,
			path: `/${p.name}`,
			mimeHint: "video",
			thumbnail: p.thumbnail,
			duration: p.duration,
			md5: p.md5,
			fsId: p.fsId,
			shareId: p.shareId,
			uk: p.uk,
			surl,
			host: "terabox",
			directUrl: p.directUrl,
			hlsUrl: p.hlsUrl,
			originalReady: Boolean(p.directUrl),
			canStream: Boolean(p.directUrl || p.hlsUrl)
		}));
		return {
			ok: true,
			host: "terabox",
			inputUrl: rawUrl,
			title: pub.title,
			files,
			warnings: [`Original file is ready via ${pub.source}.`],
			usedCookie: false,
			elapsedMs: Date.now() - started,
			source: pub.source
		};
	}
	return {
		ok: false,
		host: "terabox",
		inputUrl: rawUrl,
		error: "Could not open that TeraBox share.",
		hint: hintForNativeError(pubFail || "The share may have expired, or TeraBox is rate-limiting right now."),
		elapsedMs: Date.now() - started
	};
}
function mimeHint$2(name) {
	if (/\.(mp4|mkv|webm|mov|m4v|h264)$/i.test(name)) return "video";
	if (/\.(mp3|m4a|aac|wav|flac)$/i.test(name)) return "audio";
	if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
	return "file";
}
function attach$2(file) {
	if (file.directUrl || file.hlsUrl) file.mediaId = putMedia({
		name: file.name,
		directUrl: file.directUrl,
		hlsUrl: file.hlsUrl,
		referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.diskwala.com/")
	});
	return file;
}
function fileKey$1(f) {
	if (f.name && f.size) return `${f.name}:${f.size}`;
	return f.directUrl || f.hlsUrl || `${f.name}:0`;
}
/**
* Diskwala's website /app/:id is a "download the app" SPA. After hydrate it often
* paints "Page Not Found" even when the file is live. AppiCrypt (Talsec WASM)
* signs temp_info / playlist_info / creator_info — unsigned calls 400, replay 403.
*
* 2026-10: same public worker as TeraBox still returns the original on
* cdns*.diskwala.com / S3. We race /app/:id and /playlist/:id because albums now
* live on the playlist route (creator update). Never scrape the SPA title.
*/
async function resolveDiskwala(rawUrl) {
	const started = Date.now();
	const id = extractDiskwalaId(rawUrl);
	if (!id) return {
		ok: false,
		host: "diskwala",
		inputUrl: rawUrl,
		error: "Could not read a Diskwala file id from that URL.",
		hint: "Paste https://www.diskwala.com/app/<id> — or a whole Telegram post; Skipper pulls the Diskwala URL out of the message.",
		elapsedMs: Date.now() - started
	};
	const targets = Array.from(/* @__PURE__ */ new Set([
		canonicalDiskwalaUrl(id, "app"),
		canonicalDiskwalaUrl(id, "playlist"),
		rawUrl.trim()
	])).slice(0, 2);
	const filesAcc = [];
	let title = "";
	let source = "teraboxdl.site";
	const errors = [];
	for (const u of targets) {
		const r = await resolveTeraboxPublic(u, { kind: "diskwala" });
		if (!r.ok) {
			errors.push(r.error);
			continue;
		}
		source = r.source;
		title = title || r.title;
		for (const f of r.files) {
			if (!f.directUrl && !f.hlsUrl) continue;
			if (filesAcc.some((x) => fileKey$1(x) === fileKey$1(f))) continue;
			filesAcc.push(f);
		}
		if (filesAcc.length) break;
	}
	if (!filesAcc.length) {
		const last = errors[0] || "";
		return {
			ok: false,
			host: "diskwala",
			inputUrl: rawUrl,
			error: "That Diskwala link is not accessible right now.",
			hint: /not found|404|expired|removed/i.test(last) ? "The share may have been deleted. Diskwala's own page also shows a fake 404 for live files — if another skip-site still opens it, wait a few seconds and paste again." : "Skipper asks a public worker for the original MP4 (Diskwala's website is only an app-install landing). Telegram posts are unwrapped automatically. Try once more if the worker is warming up.",
			elapsedMs: Date.now() - started
		};
	}
	const files = filesAcc.map((p) => attach$2({
		id: p.fsId || `${id}:${p.name}`,
		name: p.name,
		size: p.size,
		isDir: false,
		path: `/${p.name}`,
		mimeHint: mimeHint$2(p.name),
		thumbnail: p.thumbnail,
		duration: p.duration,
		fsId: p.fsId || id,
		host: "diskwala",
		directUrl: p.directUrl,
		hlsUrl: p.hlsUrl,
		originalReady: Boolean(p.directUrl),
		canStream: Boolean(p.directUrl || p.hlsUrl)
	}));
	const warnings = [];
	if (files.length > 1) warnings.push(`Diskwala listed ${files.length} clips for this id (playlist/album). Use Pack if you want the whole folder as a zip.`);
	return {
		ok: true,
		host: "diskwala",
		inputUrl: rawUrl,
		title: title || files[0].name,
		files,
		warnings,
		usedCookie: false,
		elapsedMs: Date.now() - started,
		source
	};
}
var WATCH_API = "https://www.blatim.com";
var SUPABASE = "https://fifytnbsxymlkepelsma.supabase.co";
/** Public anon key shipped in Blatim's own browser bundle. RLS-gated. */
var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpZnl0bmJzeHltbGtlcGVsc21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NjIyNjgsImV4cCI6MjA5NzAzODI2OH0.baUHOKPXmaO3Gx-198iWC3OWTzYUIrXTlYX02BRaUFY";
function mimeHint$1(name) {
	if (/\.(mp4|mkv|webm|mov|m4v|h264)$/i.test(name)) return "video";
	if (/\.(mp3|m4a|aac|wav|flac)$/i.test(name)) return "audio";
	if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
	return "video";
}
function attach$1(file) {
	if (file.directUrl || file.hlsUrl) file.mediaId = putMedia({
		name: file.name,
		directUrl: file.directUrl,
		hlsUrl: file.hlsUrl,
		referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.blatim.com/")
	});
	return file;
}
async function fetchJson(url, init = {}) {
	const text = await (await fetch(url, {
		...init,
		headers: {
			"user-agent": MEDIA_UA,
			accept: "application/json",
			origin: "https://www.blatim.com",
			referer: "https://www.blatim.com/",
			...init.headers || {}
		},
		signal: AbortSignal.timeout(15e3)
	})).text();
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
async function fetchInfo(slug) {
	const json = await fetchJson(`${WATCH_API}/api/video/${encodeURIComponent(slug)}/info`);
	if (json && typeof json === "object" && !Array.isArray(json)) {
		const row = json;
		if (!row.error && (row.videoId || row.title || row.originalName || row.sourceUrl)) return row;
	}
	return null;
}
async function fetchRpc(slug) {
	const json = await fetchJson(`${SUPABASE}/rest/v1/rpc/get_public_watch_file`, {
		method: "POST",
		headers: {
			apikey: ANON,
			authorization: `Bearer ${ANON}`,
			"content-type": "application/json"
		},
		body: JSON.stringify({ p_slug: slug })
	});
	const row = Array.isArray(json) ? json[0] : json;
	if (row && typeof row === "object") return row;
	return null;
}
async function probeBytes(url) {
	if (!isAllowedCdn(url)) return {
		size: 0,
		ok: false
	};
	try {
		const res = await fetch(url, {
			method: "GET",
			headers: {
				"user-agent": MEDIA_UA,
				accept: "*/*",
				range: "bytes=0-15",
				referer: "https://www.blatim.com/",
				origin: "https://www.blatim.com"
			},
			signal: AbortSignal.timeout(12e3)
		});
		const total = res.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
		const size = total ? Number(total) : Number(res.headers.get("content-length") || 0);
		const buf = new Uint8Array(await res.arrayBuffer().catch(() => /* @__PURE__ */ new ArrayBuffer(0)));
		const isMp4 = buf.length >= 8 && buf[4] === 102 && buf[5] === 116 && buf[6] === 121 && buf[7] === 112;
		try {
			await res.body?.cancel();
		} catch {}
		return {
			size: Number.isFinite(size) ? size : 0,
			ok: res.ok || res.status === 206 || isMp4
		};
	} catch {
		return {
			size: 0,
			ok: false
		};
	}
}
function fileName(info, slug) {
	const raw = (info.originalName || info.title || slug).trim() || slug;
	if (/\.[a-z0-9]{2,5}$/i.test(raw)) return raw;
	return `${raw}.mp4`;
}
function wrapHost(files) {
	return files.map((f) => ({
		...f,
		host: "blatim"
	}));
}
/**
* Blatim /watch/:slug is an app-install wall (Broadcaster / BSplit). The public
* /api/video/:slug/info JSON is unauthenticated and, for external uploads,
* includes the original CDN URL (VidBunker, TeraBox, Diskwala). Local uploads
* sit behind a Firebase App Check signed stream — we still list those.
*/
async function resolveBlatim(rawUrl) {
	const started = Date.now();
	const slug = extractBlatimSlug(rawUrl);
	if (!slug) return {
		ok: false,
		host: "blatim",
		inputUrl: rawUrl,
		error: "Could not read a Blatim watch id from that URL.",
		hint: "Use a link like https://www.blatim.com/watch/<id> copied from Telegram, WhatsApp or Broadcaster.",
		elapsedMs: Date.now() - started
	};
	const [info, rpc] = await Promise.all([fetchInfo(slug), fetchRpc(slug)]);
	const meta = {
		...rpc || {},
		...info || {}
	};
	record("blatim", "blatim-info", Boolean(info || rpc), Date.now() - started, info?.uploadSource || "watch");
	if (!info && !rpc) return {
		ok: false,
		host: "blatim",
		inputUrl: rawUrl,
		error: "That Blatim watch page is not accessible.",
		hint: "The video may be private, removed, or the link is incomplete. Skipper never opens Blatim in a browser — paste the /watch/ link again if you just copied it.",
		elapsedMs: Date.now() - started
	};
	const title = (info?.title || rpc?.title || fileName(meta, slug)).replace(/^\/+/, "");
	const sourceUrl = typeof info?.sourceUrl === "string" ? info.sourceUrl : "";
	const warnings = [];
	if (sourceUrl) {
		const nestedHost = detectHost(sourceUrl);
		if (nestedHost === "terabox" && extractTeraSurl(sourceUrl)) {
			const nested = await resolveTerabox(sourceUrl);
			if (nested.ok && nested.files.length) return {
				...nested,
				host: "blatim",
				inputUrl: rawUrl,
				title,
				files: wrapHost(nested.files),
				warnings: [`Blatim wraps a TeraBox share — listed ${nested.files.length} file${nested.files.length === 1 ? "" : "s"} without the Broadcaster app or ads.`, ...nested.warnings],
				elapsedMs: Date.now() - started,
				source: `blatim+${nested.source || "terabox"}`
			};
		}
		if (nestedHost === "diskwala" && extractDiskwalaId(sourceUrl)) {
			const nested = await resolveDiskwala(sourceUrl);
			if (nested.ok && nested.files.length) return {
				...nested,
				host: "blatim",
				inputUrl: rawUrl,
				title,
				files: wrapHost(nested.files),
				warnings: [`Blatim wraps a Diskwala share — listed ${nested.files.length} clip${nested.files.length === 1 ? "" : "s"} without installing their app.`, ...nested.warnings],
				elapsedMs: Date.now() - started,
				source: `blatim+${nested.source || "diskwala"}`
			};
		}
		if (isAllowedCdn(sourceUrl)) {
			const probe = await probeBytes(sourceUrl);
			if (probe.ok) {
				const name = fileName(meta, slug);
				const file = attach$1({
					id: info?.videoId || slug,
					name,
					size: probe.size || Math.round((Number(info?.sizeMb) || 0) * 1e6),
					isDir: false,
					path: `/${name}`,
					mimeHint: mimeHint$1(name),
					thumbnail: info?.thumbnailUrl || rpc?.thumbnail_url || void 0,
					duration: info?.durationSeconds || void 0,
					fsId: slug,
					host: "blatim",
					directUrl: sourceUrl,
					originalReady: true,
					canStream: true
				});
				warnings.push(`Original file is on ${new URL(sourceUrl).hostname} — Play and Download skip Blatim's app wall, ads and login.`);
				return {
					ok: true,
					host: "blatim",
					inputUrl: rawUrl,
					title,
					files: [file],
					warnings,
					usedCookie: false,
					elapsedMs: Date.now() - started,
					source: info?.uploadSource || "blatim-info"
				};
			}
		}
	}
	const name = fileName(meta, slug);
	return {
		ok: true,
		host: "blatim",
		inputUrl: rawUrl,
		title,
		files: [attach$1({
			id: info?.videoId || slug,
			name,
			size: Math.round((Number(info?.sizeMb) || 0) * 1e6),
			isDir: false,
			path: `/${name}`,
			mimeHint: mimeHint$1(name),
			thumbnail: info?.thumbnailUrl || rpc?.thumbnail_url || void 0,
			duration: info?.durationSeconds || void 0,
			fsId: slug,
			host: "blatim",
			originalReady: false,
			canStream: false
		})],
		warnings: [info?.uploadSource === "local" ? "Blatim listed this local upload, but the original bytes sit behind their app-only signed stream (Firebase App Check). External VidBunker / TeraBox / Diskwala watches play here." : "Listed the watch page. The original file URL was not published on this share — Play may be unavailable."],
		usedCookie: false,
		elapsedMs: Date.now() - started,
		source: info?.uploadSource || "blatim-info"
	};
}
function isTransient(error) {
	return /timeout|rate|warming|try again|no public resolver|429|502|503/i.test(error);
}
async function resolveOne(url, cookie) {
	const host = detectHost(url);
	try {
		if (host === "terabox") return await resolveTerabox(url, cookie);
		if (host === "diskwala") return await resolveDiskwala(url);
		if (host === "blatim") return await resolveBlatim(url);
	} catch (err) {
		return {
			ok: false,
			host,
			inputUrl: url,
			error: "Could not open that share.",
			hint: err instanceof Error ? err.message : String(err),
			elapsedMs: 0
		};
	}
	return {
		ok: false,
		host: host === "telegram" ? "telegram" : "unknown",
		inputUrl: url,
		error: host === "telegram" ? "Could not read a share from that Telegram post." : "That host is not supported yet.",
		hint: "Paste a TeraBox, Diskwala or Blatim link — a full Telegram post, t.me/s preview, or a messy copy with extra text is fine.",
		elapsedMs: 0
	};
}
function mergeOk(results, inputUrl) {
	const ok = results.filter((r) => r.ok);
	if (!ok.length) {
		const last = results.find((r) => !r.ok);
		return last && !last.ok ? last : {
			ok: false,
			host: "unknown",
			inputUrl,
			error: "Could not open those shares.",
			elapsedMs: 0
		};
	}
	const files = [];
	const seen = /* @__PURE__ */ new Set();
	for (const r of ok) for (const f of r.files) {
		const key = `${f.host}:${f.name}:${f.size}`;
		if (seen.has(key)) continue;
		seen.add(key);
		files.push(f);
	}
	const warnings = ok.flatMap((r) => r.warnings);
	if (ok.length > 1) warnings.unshift(`Opened ${ok.length} shares from that paste.`);
	return {
		ok: true,
		host: ok[0].host,
		inputUrl,
		title: ok[0].title,
		files,
		warnings,
		usedCookie: ok.some((r) => r.usedCookie),
		elapsedMs: Math.max(...ok.map((r) => r.elapsedMs)),
		source: ok.map((r) => r.source).filter(Boolean).join("+") || ok[0].source
	};
}
async function resolveShare(rawUrl, cookie = "") {
	const started = Date.now();
	enterUser();
	try {
		const url = normalizePaste(rawUrl);
		if (!url) return {
			ok: false,
			host: "unknown",
			inputUrl: rawUrl,
			error: "Paste a TeraBox, Diskwala, Blatim or Telegram link first.",
			elapsedMs: 0
		};
		const target = (await expandPaste(url, "one"))[0] || url;
		let result = await resolveOne(target, cookie);
		if (!result.ok && isTransient(`${result.error} ${result.hint || ""}`)) result = await resolveOne(target, cookie);
		if (result.ok || result.host !== "unknown") return {
			...result,
			inputUrl: rawUrl,
			elapsedMs: Date.now() - started
		};
		const extras = await expandPaste(url, "all");
		if (extras.length > 1) return {
			...mergeOk(await Promise.all(extras.slice(0, 6).map((u) => resolveOne(u, cookie))), rawUrl),
			elapsedMs: Date.now() - started
		};
		return {
			...result,
			inputUrl: rawUrl,
			elapsedMs: Date.now() - started
		};
	} finally {
		leaveUser();
	}
}
var MAX_FILES = 40;
function mimeHint(name) {
	if (/\.(mp4|mkv|webm|mov|m4v|h264)$/i.test(name)) return "video";
	if (/\.(mp3|m4a|aac|wav|flac)$/i.test(name)) return "audio";
	if (/\.(jpg|jpeg|png|gif|webp)$/i.test(name)) return "image";
	return "file";
}
function attach(file) {
	if (file.directUrl || file.hlsUrl) file.mediaId = putMedia({
		name: file.name,
		directUrl: file.directUrl,
		hlsUrl: file.hlsUrl,
		referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.diskwala.com/")
	});
	return file;
}
function asResolved(p, packKey, index) {
	const name = p.name || `file-${index + 1}`;
	return attach({
		id: `${packKey}:${index}:${p.fsId || name}`,
		name,
		size: p.size,
		isDir: false,
		path: `/${name}`,
		mimeHint: mimeHint(name),
		thumbnail: p.thumbnail,
		duration: p.duration,
		fsId: p.fsId || packKey,
		host: "diskwala",
		directUrl: p.directUrl,
		hlsUrl: p.hlsUrl,
		originalReady: Boolean(p.directUrl),
		canStream: Boolean(p.directUrl || p.hlsUrl)
	});
}
function storagePrefix(url) {
	if (!url) return "";
	try {
		return decodeURIComponent(new URL(url).pathname).split("/").filter(Boolean)[0] || "";
	} catch {
		return "";
	}
}
function fileKey(f) {
	return f.directUrl || f.hlsUrl || `${f.name}:${f.size}`;
}
function dedupe(files) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const f of files) {
		const key = fileKey(f);
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(f);
	}
	return out.slice(0, MAX_FILES);
}
function packUrlsFor(rawUrl, id) {
	let path = "";
	try {
		path = new URL(rawUrl).pathname.toLowerCase();
	} catch {
		path = "";
	}
	const app = `https://www.diskwala.com/app/${id}`;
	const playlist = `https://www.diskwala.com/playlist/${id}`;
	const creator = `https://www.diskwala.com/creator/${id}`;
	if (path.includes("/playlist/")) return [
		rawUrl,
		app,
		creator
	];
	if (path.includes("/creator/")) return [
		rawUrl,
		playlist,
		app
	];
	return [
		playlist,
		rawUrl.startsWith("http") ? rawUrl : app,
		creator
	];
}
/**
* Diskwala /app/:id is one clip. The same id as /playlist/:id is how Telegram
* albums and multi-file posts list every related clip. Pack fetches both and
* merges — seed file always kept, playlist siblings kept when they share the
* same storage prefix (same post/folder). If prefixes differ we still surface
* the playlist files (the worker's album dump) plus the exact share.
*/
async function resolveDiskwalaPack(rawUrl) {
	const started = Date.now();
	const trimmed = rawUrl.trim();
	if (detectHost(trimmed) !== "diskwala") return {
		ok: false,
		host: detectHost(trimmed),
		inputUrl: rawUrl,
		error: "Folder Pack only opens Diskwala, TeraBox and Blatim links.",
		hint: "Use the search bar above, or paste a diskwala.com / terabox / blatim.com link here for the folder dump.",
		elapsedMs: Date.now() - started
	};
	const id = extractDiskwalaId(trimmed);
	if (!id) return {
		ok: false,
		host: "diskwala",
		inputUrl: rawUrl,
		error: "Could not read a Diskwala id from that URL.",
		hint: "Paste https://www.diskwala.com/app/<id> — Pack also tries /playlist/<id> for every related clip.",
		elapsedMs: Date.now() - started
	};
	const targets = packUrlsFor(trimmed, id);
	const results = [];
	for (const u of targets) results.push(await resolveTeraboxPublic(u, { kind: "diskwala" }));
	let seedFiles = [];
	let albumFiles = [];
	let title = "";
	let source = "teraboxdl.site";
	for (let i = 0; i < results.length; i++) {
		const r = results[i];
		if (!r.ok) continue;
		source = r.source;
		const playable = r.files.filter((f) => f.directUrl || f.hlsUrl);
		if (!playable.length) continue;
		if (/\/playlist\//i.test(targets[i])) {
			albumFiles = playable;
			title = r.title || title;
		} else if (/\/app\//i.test(targets[i]) || i === targets.length - 1) {
			seedFiles = playable;
			if (!title) title = r.title;
		} else {
			albumFiles = albumFiles.length >= playable.length ? albumFiles : playable;
			title = title || r.title;
		}
	}
	const seedPrefix = storagePrefix(seedFiles[0]?.directUrl);
	const albumPrefix = storagePrefix(albumFiles[0]?.directUrl);
	const sameFolder = Boolean(seedPrefix && albumPrefix && seedPrefix === albumPrefix);
	let merged = [];
	if (albumFiles.length > 1 && sameFolder) {
		merged = [...albumFiles];
		for (const s of seedFiles) if (!merged.some((f) => fileKey(f) === fileKey(s))) merged.unshift(s);
	} else if (seedFiles.length) {
		merged = [...seedFiles];
		if (sameFolder) {
			for (const a of albumFiles) if (!merged.some((f) => fileKey(f) === fileKey(a))) merged.push(a);
		}
	} else merged = [...albumFiles];
	merged = dedupe(merged);
	if (!merged.length) {
		const lastErr = results.find((r) => !r.ok);
		return {
			ok: false,
			host: "diskwala",
			inputUrl: rawUrl,
			error: "Could not collect that Diskwala pack.",
			hint: lastErr && !lastErr.ok ? lastErr.error : "The worker listed no playable files for this id.",
			elapsedMs: Date.now() - started
		};
	}
	const files = merged.map((p, i) => asResolved(p, id, i));
	const packId = putPack(title || files[0].name, files.filter((f) => f.mediaId).map((f) => ({
		name: f.name,
		mediaId: f.mediaId,
		size: f.size
	})));
	const totalBytes = files.reduce((n, f) => n + (f.size || 0), 0);
	const warnings = [];
	if (files.length === 1) warnings.push("Only one clip on this id — Diskwala did not attach a multi-file album.");
	else if (sameFolder) warnings.push(`Collected ${files.length} clips from the same Diskwala folder.`);
	else warnings.push(`Kept the exact share (${files.length} file${files.length === 1 ? "" : "s"}). A worker album dump looked unrelated, so it was not mixed in — paste a /playlist/ link if this is a folder.`);
	return {
		ok: true,
		host: "diskwala",
		inputUrl: rawUrl,
		title: seedFiles[0]?.name || title || files[0].name,
		files,
		warnings,
		usedCookie: false,
		elapsedMs: Date.now() - started,
		source,
		packId,
		totalBytes
	};
}
function withZip(result) {
	if (!result.ok) return result;
	const files = result.files.filter((f) => f.mediaId && (f.directUrl || f.hlsUrl));
	if (!files.length) return result;
	const packId = putPack(result.title || files[0].name, files.map((f) => ({
		name: f.name,
		mediaId: f.mediaId,
		size: f.size
	})));
	const totalBytes = files.reduce((n, f) => n + (f.size || 0), 0);
	return {
		...result,
		packId,
		totalBytes
	};
}
function publicToResolve(rawUrl, walked) {
	const files = walked.files.map((p, index) => {
		const name = p.name || `file-${index + 1}`;
		const file = {
			id: p.fsId || `${index}:${name}`,
			name,
			size: p.size,
			isDir: false,
			path: `/${name}`,
			mimeHint: /\.(mp3|m4a|aac|wav|flac)$/i.test(name) ? "audio" : /\.(jpg|jpeg|png|gif|webp)$/i.test(name) ? "image" : "video",
			thumbnail: p.thumbnail,
			duration: p.duration,
			md5: p.md5,
			fsId: p.fsId,
			shareId: p.shareId,
			uk: p.uk,
			host: "terabox",
			directUrl: p.directUrl,
			hlsUrl: p.hlsUrl,
			originalReady: Boolean(p.directUrl),
			canStream: Boolean(p.directUrl || p.hlsUrl)
		};
		if (file.directUrl || file.hlsUrl) file.mediaId = putMedia({
			name: file.name,
			directUrl: file.directUrl,
			hlsUrl: file.hlsUrl,
			referer: refererFor(file.directUrl || file.hlsUrl || "", "https://www.teraboxdl.site/")
		});
		return file;
	});
	const warnings = [files.length === 1 ? "This public share has one file. The rest of that TeraBox account is private and is not listed." : `Collected ${files.length} files from this public share — extra pages and folders the worker published. Other shares on the same account stay private.`];
	if (walked.truncated) warnings.push("Stopped early so Pack stays responsive. A few folders in this share may be missing.");
	return withZip({
		ok: true,
		host: "terabox",
		inputUrl: rawUrl,
		title: walked.title || files[0]?.name || "TeraBox share",
		files,
		warnings,
		usedCookie: false,
		elapsedMs: 0,
		source: walked.source
	});
}
async function resolvePackOne(rawUrl) {
	const started = Date.now();
	const host = detectHost(rawUrl.trim());
	if (host === "diskwala") return resolveDiskwalaPack(rawUrl);
	if (host === "terabox") {
		const walked = await walkTeraboxPublic(rawUrl);
		if (walked.ok) return publicToResolve(rawUrl, walked);
		const result = withZip(await resolveTerabox(rawUrl));
		if (!result.ok) return result;
		return {
			...result,
			warnings: [result.files.length === 1 ? "This public share has one file. The rest of that TeraBox account is private and is not listed." : `Collected ${result.files.length} files from this public share. Other shares on the same account stay private.`, ...result.warnings]
		};
	}
	if (host === "blatim") {
		const result = withZip(await resolveBlatim(rawUrl));
		if (!result.ok) return result;
		const warnings = result.files.length === 1 ? ["One watch file on this Blatim link. Blatim does not publish the rest of this uploader’s videos. If the file wraps a TeraBox or Diskwala folder, that public folder is included."] : [`Collected ${result.files.length} files behind this Blatim watch. Other uploads on the same account stay private.`];
		return {
			...result,
			warnings: [...warnings, ...result.warnings]
		};
	}
	return {
		ok: false,
		host,
		inputUrl: rawUrl,
		error: "Folder Pack opens TeraBox, Diskwala and Blatim links.",
		hint: "Paste a public share — Telegram posts are unwrapped to the nested shares.",
		elapsedMs: Date.now() - started
	};
}
function mergePacks(results, inputUrl) {
	const ok = results.filter((r) => r.ok);
	if (!ok.length) {
		const last = results.find((r) => !r.ok);
		return last && !last.ok ? last : {
			ok: false,
			host: "unknown",
			inputUrl,
			error: "Could not collect that pack.",
			elapsedMs: 0
		};
	}
	const files = [];
	const seen = /* @__PURE__ */ new Set();
	for (const r of ok) for (const f of r.files) {
		const key = `${f.name}:${f.size}:${f.directUrl || f.hlsUrl || ""}`;
		if (seen.has(key)) continue;
		seen.add(key);
		files.push(f);
	}
	return withZip({
		ok: true,
		host: ok[0].host,
		inputUrl,
		title: ok[0].title,
		files,
		warnings: [`Collected ${files.length} files from ${ok.length} share${ok.length === 1 ? "" : "s"} in that paste.`, ...ok.flatMap((r) => r.warnings)],
		usedCookie: false,
		elapsedMs: Math.max(...ok.map((r) => r.elapsedMs)),
		source: ok.map((r) => r.source).filter(Boolean).join("+")
	});
}
/**
* One folder dump for every supported host. Telegram pastes are unwrapped first.
* TeraBox pages the public share (worker dir + page, capped). Diskwala walks
* /app + /playlist + /creator one at a time. Blatim unwraps a watch link.
* A private account is never listed — only the share that was pasted.
*/
async function resolvePack(rawUrl) {
	const started = Date.now();
	enterUser();
	try {
		const shares = await expandPaste(normalizePaste(rawUrl), "all");
		if (!shares.length) return {
			ok: false,
			host: "unknown",
			inputUrl: rawUrl,
			error: "Folder Pack opens TeraBox, Diskwala and Blatim links.",
			hint: "Paste a public share — the same hosts as the search bar above, including Telegram posts.",
			elapsedMs: Date.now() - started
		};
		if (shares.length === 1) return {
			...await resolvePackOne(shares[0]),
			inputUrl: rawUrl,
			elapsedMs: Date.now() - started
		};
		const many = [];
		for (const u of shares.slice(0, 8)) many.push(await resolvePackOne(u));
		return {
			...mergePacks(many, rawUrl),
			elapsedMs: Date.now() - started
		};
	} finally {
		leaveUser();
	}
}
//#endregion
export { fetchTeraboxPlaylist as a, isAllowedCdn as c, putMedia as d, refererFor as f, statusPayload as g, segmentAllowed as h, fetchTeraboxDlink as i, kickRefresh as l, resolveShare as m, allowSegments as n, getMedia as o, resolvePack as p, detectHost as r, getPack as s, MEDIA_UA as t, normalizePaste as u };
