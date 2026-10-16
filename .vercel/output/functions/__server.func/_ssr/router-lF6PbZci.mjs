import { o as __toESM, r as __exportAll } from "../_runtime.mjs";
import { J as require_react, _ as createFileRoute, b as useRouter, d as Scripts, f as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, v as createRootRoute, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as fetchTeraboxPlaylist, c as isAllowedCdn, d as putMedia, f as refererFor, g as statusPayload, h as segmentAllowed, i as fetchTeraboxDlink, l as kickRefresh, m as resolveShare, n as allowSegments, o as getMedia, p as resolvePack, r as detectHost, s as getPack, t as MEDIA_UA, u as normalizePaste } from "./pack-Buvn6sgS.mjs";
import { n as getSessionCookie, r as mergeCookies } from "./session-H4L6vJGS.mjs";
import { n as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as union, i as string, n as number, r as object, t as literal } from "../_libs/zod.mjs";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
//#region node_modules/.nitro/vite/services/ssr/assets/router-lF6PbZci.js
var router_lF6PbZci_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-red-500",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400",
				children: error instanceof Error ? error.message : "An unexpected error occurred. Try reloading the page."
			})
		]
	});
}
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = object({
	channel: literal(PREVIEW_BRIDGE_CHANNEL),
	version: number().int().positive(),
	type: string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: literal("navigate"),
	path: string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: literal("history"),
	delta: union([literal(-1), literal(1)])
});
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	if (typeof window === "undefined") return () => {};
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	const parentOrigin = resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		if (envelope.data.type === "hello") {
			if (!HelloSchema.safeParse(event.data).success) return;
			announce();
			return;
		}
		if (envelope.data.type === "navigate") {
			const parsed = NavigateSchema.safeParse(event.data);
			if (!parsed.success) return;
			navigate(parsed.data.path);
			queueMicrotask(reportLocation);
			return;
		}
		if (envelope.data.type === "history") {
			const parsed = HistorySchema.safeParse(event.data);
			if (!parsed.success) return;
			if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
			window.history.go(parsed.data.delta);
		}
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
var styles_default = "/assets/styles-CJS2sbai.css";
var APP_NAME = "Skipper";
var Route$13 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "theme-color",
				content: "#0b0d10"
			},
			{
				name: "description",
				content: "Paste a share link or any public video page. Play or download the file — no ads."
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewHostBridge, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})
		] })]
	})
});
var $$splitComponentImporter$2 = () => import("./routes-CQ3qnlZ4.mjs");
var Route$12 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./any-BjzKg7Uv.mjs");
var Route$11 = createFileRoute("/any")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./guide-D1pvaPGW.mjs");
var Route$10 = createFileRoute("/guide")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var WALLED = [
	"youtube.com",
	"youtu.be",
	"youtube-nocookie.com",
	"googlevideo.com",
	"netflix.com",
	"nflxvideo.net",
	"nflxso.net",
	"disneyplus.com",
	"hulu.com",
	"primevideo.com",
	"spotify.com",
	"scdn.co",
	"hotstar.com",
	"hbomax.com",
	"max.com",
	"tv.apple.com",
	"vimeo.com",
	"dailymotion.com",
	"tiktok.com"
];
var dnsCache = /* @__PURE__ */ new Map();
var DNS_TTL = 6e4;
function isWalledHost(hostname) {
	const host = hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
	return WALLED.some((d) => host === d || host.endsWith(`.${d}`));
}
function privateIPv4(ip) {
	const parts = ip.split(".").map((n) => Number(n));
	if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
	const [a, b] = parts;
	if (a === 0 || a === 10 || a === 127) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	if (a === 100 && b >= 64 && b <= 127) return true;
	if (a === 192 && b === 0) return true;
	if (a === 198 && (b === 18 || b === 19)) return true;
	if (a >= 224) return true;
	return false;
}
function privateIP(ip) {
	const lower = ip.toLowerCase();
	if (lower.includes(".")) {
		const mapped = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
		if (mapped) return privateIPv4(mapped[1]);
	}
	if (lower === "::1" || lower === "::") return true;
	if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
	if (isIP(lower) === 4) return privateIPv4(lower);
	return false;
}
/** https/http only, no credentials, no loopback, link-local, or private DNS. */
async function isPublicHttpUrl(raw) {
	let url;
	try {
		url = new URL(raw);
	} catch {
		return false;
	}
	if (url.protocol !== "https:" && url.protocol !== "http:") return false;
	if (url.username || url.password) return false;
	const host = url.hostname.toLowerCase().replace(/\.$/, "");
	if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
	if (host.endsWith(".internal") || host === "metadata.google.internal") return false;
	if (/^\d+$/.test(host)) return false;
	const dotted = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
	if (dotted) {
		if (dotted.slice(1).some((p) => p.length > 1 && p.startsWith("0"))) return false;
		return !privateIPv4(dotted.slice(1).map((p) => String(Number(p))).join("."));
	}
	if (isIP(host)) return !privateIP(host);
	const cached = dnsCache.get(host);
	const now = Date.now();
	if (cached && now - cached.at < DNS_TTL) return cached.ok;
	try {
		const records = await lookup(host, {
			all: true,
			verbatim: true
		});
		const ok = records.length > 0 && records.every((r) => !privateIP(r.address));
		dnsCache.set(host, {
			at: now,
			ok
		});
		return ok;
	} catch {
		dnsCache.set(host, {
			at: now,
			ok: false
		});
		return false;
	}
}
var PASS_HEADERS = [
	"content-type",
	"content-length",
	"content-range",
	"accept-ranges"
];
async function fetchPublic(url, opts = {}) {
	let current = url;
	const method = opts.method === "HEAD" ? "HEAD" : "GET";
	for (let hop = 0; hop < 4; hop++) {
		if (!await isPublicHttpUrl(current)) return null;
		const ctrl = new AbortController();
		const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15e3);
		let res;
		try {
			res = await fetch(current, {
				method,
				redirect: "manual",
				signal: ctrl.signal,
				headers: {
					"user-agent": MEDIA_UA,
					accept: "*/*",
					...opts.referer ? { referer: opts.referer } : {},
					...opts.range ? { range: opts.range } : {}
				}
			});
		} catch {
			return null;
		} finally {
			clearTimeout(timer);
		}
		if (res.status >= 300 && res.status < 400) {
			const loc = res.headers.get("location");
			try {
				await res.body?.cancel();
			} catch {}
			if (!loc) return {
				res,
				url: current
			};
			try {
				current = new URL(loc, current).href;
			} catch {
				return null;
			}
			continue;
		}
		return {
			res,
			url: current
		};
	}
	return null;
}
function mediaResponse(res, opts) {
	const headers = new Headers();
	for (const k of PASS_HEADERS) {
		const v = res.headers.get(k);
		if (v) headers.set(k, v);
	}
	if (!headers.has("accept-ranges")) headers.set("accept-ranges", "bytes");
	if (!headers.has("content-type")) {
		const name = (opts.filename || "").toLowerCase();
		headers.set("content-type", name.endsWith(".mp4") ? "video/mp4" : name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : "application/octet-stream");
	}
	const safe = (opts.filename || "file").replace(/[^\w.\- ()[\]]+/g, "_") || "file";
	headers.set("content-disposition", opts.asDownload ? `attachment; filename="${safe}"` : `inline; filename="${safe}"`);
	headers.set("cache-control", "private, max-age=60");
	headers.set("access-control-allow-origin", "*");
	headers.set("access-control-expose-headers", "content-length, content-range, accept-ranges, content-disposition");
	headers.set("access-control-allow-headers", "range");
	if (opts.request.method === "HEAD") {
		try {
			res.body?.cancel();
		} catch {}
		return new Response(null, {
			status: res.status,
			headers
		});
	}
	return new Response(res.body, {
		status: res.status,
		headers
	});
}
async function proxyMedia(opts) {
	if (opts.publicDirect) {
		const got = await fetchPublic(opts.url, {
			range: opts.request.headers.get("range"),
			referer: safeReferer(opts.referer),
			method: opts.request.method
		});
		if (!got) return Response.json({ error: "blocked host" }, { status: 400 });
		const ctype = got.res.headers.get("content-type") || "";
		if (/text\/html|javascript|\/json/i.test(ctype)) {
			try {
				await got.res.body?.cancel();
			} catch {}
			return Response.json({ error: "That link is not a video file." }, { status: 415 });
		}
		return mediaResponse(got.res, opts);
	}
	if (!isAllowedCdn(opts.url)) return Response.json({ error: "blocked host" }, { status: 400 });
	const range = opts.request.headers.get("range");
	const method = opts.request.method === "HEAD" ? "HEAD" : "GET";
	let origin = opts.referer;
	try {
		origin = new URL(opts.referer).origin;
	} catch {}
	return mediaResponse(await fetch(opts.url, {
		method,
		headers: {
			"user-agent": MEDIA_UA,
			accept: "*/*",
			referer: opts.referer,
			origin,
			...range ? { range } : {}
		},
		redirect: "follow"
	}), opts);
}
function safeReferer(referer) {
	try {
		const url = new URL(referer);
		if (url.protocol === "https:" || url.protocol === "http:") return url.href;
	} catch {}
}
function corsPreflight() {
	return new Response(null, {
		status: 204,
		headers: {
			"access-control-allow-origin": "*",
			"access-control-allow-methods": "GET, HEAD, OPTIONS",
			"access-control-allow-headers": "range",
			"access-control-max-age": "86400"
		}
	});
}
var MAX_FILES = 24;
var MAX_HTML = 12e5;
var MEDIA_EXT = /\.(mp4|webm|m4v|mov|mkv|ogv|ogg|m3u8)(?:$|[?#])/i;
var PLAYABLE_EXT = /\.(mp4|webm|m4v|mov|ogv|ogg|m3u8)(?:$|[?#])/i;
var hits = [];
function underLimit() {
	const now = Date.now();
	while (hits.length && hits[0] < now - 3e4) hits.shift();
	if (hits.length >= 24) return false;
	hits.push(now);
	return true;
}
function decodeTitle(raw) {
	return raw.replace(/&/gi, "&").replace(/"/gi, "\"").replace(/&#39;|'/gi, "'").replace(/</gi, "<").replace(/>/gi, ">").replace(/\s+/g, " ").trim().slice(0, 140);
}
function flatten(html) {
	return html.replace(/\\u0026/gi, "&").replace(/\\u002f/gi, "/").replace(/\\\//g, "/").replace(/&/gi, "&");
}
function resolveAgainst(raw, base) {
	const cleaned = raw.trim().replace(/^['"]|['"]$/g, "");
	if (!cleaned || cleaned.startsWith("blob:") || cleaned.startsWith("data:")) return null;
	try {
		const url = new URL(cleaned, base);
		if (url.protocol !== "https:" && url.protocol !== "http:") return null;
		url.hash = "";
		return url.href;
	} catch {
		return null;
	}
}
function looksLikeMedia(url) {
	return MEDIA_EXT.test(url.pathname) || MEDIA_EXT.test(url.href);
}
/** Public file URLs published in HTML: video tags, og:video, JSON-LD, and bare media links. */
function collectMediaUrls(html, base) {
	const flat = flatten(html);
	const found = [];
	const seen = /* @__PURE__ */ new Set();
	const add = (raw, loose) => {
		const abs = resolveAgainst(raw, base);
		if (!abs || seen.has(abs)) return;
		let url;
		try {
			url = new URL(abs);
		} catch {
			return;
		}
		if (isWalledHost(url.hostname)) return;
		if (!loose && !looksLikeMedia(url)) return;
		seen.add(abs);
		found.push(abs);
	};
	const tagRe = /<(video|source|meta)\b[^>]*>/gi;
	let tag;
	while (tag = tagRe.exec(flat)) {
		const el = tag[0];
		if (tag[1].toLowerCase() === "meta") {
			const key = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(el)?.[1]?.toLowerCase() ?? "";
			if (!/^(og:video(?::(?:url|secure_url))?|twitter:player:stream)$/.test(key)) continue;
			const content = /content\s*=\s*["']([^"']+)["']/i.exec(el)?.[1];
			if (content) add(content, true);
			continue;
		}
		for (const attr of [
			"src",
			"data-src",
			"data-video"
		]) {
			const m = new RegExp(String.raw`${attr}\s*=\s*["']([^"']+)["']`, "i").exec(el);
			if (m) add(m[1], true);
		}
	}
	const jsonRe = /"(?:contentUrl|file|src|videoUrl)"\s*:\s*"(https?:[^"]+)"/gi;
	let jm;
	while (jm = jsonRe.exec(flat)) add(jm[1], true);
	const bare = /https?:\/\/[^\s"'<>]{6,700}\.(?:mp4|webm|m4v|mov|mkv|ogv|ogg|m3u8)(?:\?[^\s"'<>]*)?/gi;
	let bm;
	while (bm = bare.exec(flat)) add(bm[0].replace(/[),.;]+$/g, ""), false);
	return found.slice(0, 48);
}
function fileName(url, index) {
	try {
		const clean = decodeURIComponent(new URL(url).pathname.split("/").pop() || "").replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 120);
		if (clean && clean !== "_" && clean !== ".") return clean;
	} catch {}
	return `video-${index + 1}.mp4`;
}
function toFile(url, index, referer) {
	const name = fileName(url, index);
	const path = (() => {
		try {
			return new URL(url).pathname;
		} catch {
			return "";
		}
	})();
	const hls = /\.m3u8(?:$|[?#])/i.test(path);
	const canStream = PLAYABLE_EXT.test(path) || hls;
	const mediaId = putMedia({
		name,
		directUrl: hls ? void 0 : url,
		hlsUrl: hls ? url : void 0,
		referer,
		publicDirect: true
	});
	return {
		id: mediaId,
		name,
		size: 0,
		isDir: false,
		path: "/",
		mimeHint: "video",
		host: "unknown",
		directUrl: hls ? void 0 : url,
		hlsUrl: hls ? url : void 0,
		mediaId,
		originalReady: true,
		canStream
	};
}
async function readLimited(res, max) {
	const reader = res.body?.getReader();
	if (!reader) return "";
	const dec = new TextDecoder();
	let out = "";
	let size = 0;
	while (size < max) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		out += dec.decode(value, { stream: true });
	}
	try {
		await reader.cancel();
	} catch {}
	out += dec.decode();
	return out.slice(0, max);
}
function fail(inputUrl, error, elapsedMs, hint) {
	return {
		ok: false,
		host: "unknown",
		inputUrl,
		error,
		hint,
		elapsedMs
	};
}
async function findPublicVideos(raw) {
	const started = Date.now();
	const elapsed = () => Date.now() - started;
	const input = normalizePaste(raw);
	if (!input) return fail("", "Paste a link.", 0, "A page address or a direct .mp4 / .webm / .m3u8 link.");
	let page;
	try {
		page = new URL(input);
	} catch {
		return fail(input, "That is not a link.", elapsed(), "Include the full address, starting with https://");
	}
	if (page.protocol !== "https:" && page.protocol !== "http:") return fail(input, "Only web links work.", elapsed(), "Paste an https address.");
	const known = detectHost(page.href);
	if (known === "terabox" || known === "diskwala" || known === "blatim" || known === "telegram") return resolveShare(page.href, "");
	if (isWalledHost(page.hostname)) return fail(page.href, "That site locks the video inside its own player.", elapsed(), "Skipper saves files a page publishes directly (.mp4, .webm, .m3u8). YouTube, Netflix, and similar apps do not. Paste the file link itself, or a TeraBox, Diskwala, or Blatim share on the home page.");
	if (!underLimit()) return fail(page.href, "Slow down a moment.", elapsed(), "Too many page reads at once. Try again in a few seconds.");
	if (!await isPublicHttpUrl(page.href)) return fail(page.href, "That address is not a public website.", elapsed());
	const got = await fetchPublic(page.href, {
		timeoutMs: 8e3,
		referer: page.origin
	});
	if (!got) return fail(page.href, "Could not open that page.", elapsed(), "The site did not answer, or the address is not public. If you have the direct video file link, paste that.");
	const ctype = got.res.headers.get("content-type") || "";
	const finalUrl = got.url;
	const htmlLike = /text\/html|application\/xhtml/i.test(ctype);
	const finalLooks = (() => {
		try {
			return looksLikeMedia(new URL(finalUrl));
		} catch {
			return false;
		}
	})();
	const mediaType = /^(video|audio)\//i.test(ctype) || /mpegurl/i.test(ctype);
	if (!htmlLike && (mediaType || finalLooks && !/xml|json|javascript|html/i.test(ctype))) {
		if (got.res.status >= 400) {
			try {
				await got.res.body?.cancel();
			} catch {}
			return fail(page.href, "The file server refused that link.", elapsed(), `It answered ${got.res.status}. The file may be private, or it only opens in a browser session.`);
		}
		try {
			await got.res.body?.cancel();
		} catch {}
		if (!await isPublicHttpUrl(finalUrl)) return fail(page.href, "That file is not on a public server.", elapsed());
		return {
			ok: true,
			host: "unknown",
			inputUrl: page.href,
			title: fileName(finalUrl, 0),
			files: [toFile(finalUrl, 0, page.href)],
			warnings: [],
			usedCookie: false,
			elapsedMs: elapsed(),
			source: "direct"
		};
	}
	if (finalLooks && got.res.status >= 400) {
		try {
			await got.res.body?.cancel();
		} catch {}
		return fail(page.href, "The file server refused that link.", elapsed(), `It answered ${got.res.status}. The file may be private, or it only opens in a browser session.`);
	}
	if (ctype && !/text\/html|text\/plain|application\/xhtml|xml/i.test(ctype)) {
		try {
			await got.res.body?.cancel();
		} catch {}
		return fail(page.href, "That link is not a video or a web page.", elapsed(), "Paste a page that embeds a video, or a direct .mp4 / .webm / .m3u8 file.");
	}
	const html = await readLimited(got.res, MAX_HTML);
	const titleMatch = html.match(/<title[^>]*>([^<]{1,180})<\/title>/i);
	const title = titleMatch ? decodeTitle(titleMatch[1]) : new URL(finalUrl).hostname;
	const candidates = collectMediaUrls(html, finalUrl);
	const checked = [];
	await Promise.all(candidates.slice(0, 48).map(async (url) => {
		if (await isPublicHttpUrl(url)) checked.push(url);
	}));
	const unique = [...new Set(checked)].slice(0, MAX_FILES);
	unique.sort((a, b) => Number(/\.(mp4|webm|m4v|mov)(?:$|[?#])/i.test(b)) - Number(/\.(mp4|webm|m4v|mov)(?:$|[?#])/i.test(a)));
	if (!unique.length) {
		const embedded = /youtube\.com|youtu\.be|player\.vimeo|tiktok\.com|dailymotion\.com/i.test(html);
		return fail(page.href, embedded ? "This page only embeds a locked player." : "No public video file on that page.", elapsed(), embedded ? "The video plays inside YouTube or a similar app. Skipper can save it only when the page itself publishes an .mp4, .webm, or .m3u8 file." : "Many sites hide the file in a script or behind a login. Paste the direct video link if you have it. One page is one page — not every file on a private account.");
	}
	const warnings = ["Only the public video files on this page. Other files on the same account stay private."];
	if (candidates.length > unique.length) warnings.push("Some links were skipped because they are not public video files.");
	if (html.length >= MAX_HTML) warnings.push("The page was very large. Showing the videos found in the first part.");
	return {
		ok: true,
		host: "unknown",
		inputUrl: page.href,
		title: title || new URL(finalUrl).hostname,
		files: unique.map((url, i) => toFile(url, i, finalUrl)),
		warnings,
		usedCookie: false,
		elapsedMs: elapsed(),
		source: "page"
	};
}
var Route$9 = createFileRoute("/api/any")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const url = typeof body.url === "string" ? body.url : "";
	if (!url.trim()) return Response.json({
		ok: false,
		host: "unknown",
		inputUrl: "",
		error: "Paste a link.",
		elapsedMs: 0
	});
	try {
		return Response.json(await findPublicVideos(url));
	} catch (err) {
		return Response.json({
			ok: false,
			host: "unknown",
			inputUrl: url,
			error: err instanceof Error ? err.message : "Could not read that page.",
			elapsedMs: 0
		});
	}
} } } });
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var Route$8 = createFileRoute("/api/download")({ server: { handlers: { GET: async ({ request }) => {
	const u = new URL(request.url);
	const mode = u.searchParams.get("mode") ?? "stream";
	const name = u.searchParams.get("name") ?? "file";
	const uk = u.searchParams.get("uk") ?? "";
	const shareId = u.searchParams.get("shareid") ?? "";
	const fid = u.searchParams.get("fid") ?? "";
	const cookie = u.searchParams.get("cookie") ?? "";
	const direct = u.searchParams.get("direct") ?? "";
	const mediaId = u.searchParams.get("id") ?? "";
	if (mediaId) {
		const entry = getMedia(mediaId);
		if (!entry?.directUrl) return Response.json({ error: "Media link expired. Open the share again." }, { status: 410 });
		return Response.redirect(entry.directUrl, 302);
	}
	if (direct) {
		if (!isAllowedCdn(direct)) return Response.json({ error: "blocked host" }, { status: 400 });
		return proxyMedia({
			url: direct,
			request,
			filename: name,
			referer: refererFor(direct, "https://www.teraboxdl.site/"),
			asDownload: true
		});
	}
	if (mode === "original" && cookie && uk && shareId && fid) {
		const dlink = await fetchTeraboxDlink({
			uk,
			shareId,
			fsId: fid,
			cookie
		});
		if (dlink) return proxyMedia({
			url: dlink,
			request,
			filename: name,
			referer: "https://www.1024tera.com/",
			asDownload: true
		});
	}
	if (!uk || !shareId || !fid) return Response.json({ error: "missing file ids" }, { status: 400 });
	const playlist = await fetchTeraboxPlaylist(uk, shareId, fid);
	if ("error" in playlist) return Response.json({ error: playlist.error }, { status: 502 });
	const segments = playlist.playlist.split("\n").filter((l) => l.startsWith("http"));
	if (!segments.length) return Response.json({ error: "empty playlist" }, { status: 502 });
	const filename = name.replace(/[^\w.\- ()[\]]+/g, "_");
	const stream = concatSegments(segments);
	return new Response(stream, { headers: {
		"content-type": "video/mp2t",
		"content-disposition": `attachment; filename="${filename.replace(/\.[^.]+$/, "")}.ts"`,
		"cache-control": "no-store"
	} });
} } } });
function concatSegments(urls) {
	return new ReadableStream({ async start(controller) {
		try {
			for (const url of urls) {
				const res = await fetch(url, { headers: {
					"user-agent": UA,
					referer: "https://www.1024tera.com/"
				} });
				if (!res.body) continue;
				const reader = res.body.getReader();
				for (;;) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value) controller.enqueue(value);
				}
			}
			controller.close();
		} catch (err) {
			controller.error(err);
		}
	} });
}
var Route$7 = createFileRoute("/api/file")({ server: { handlers: {
	OPTIONS: async () => corsPreflight(),
	HEAD: (ctx) => handle(ctx.request),
	GET: (ctx) => handle(ctx.request)
} } });
async function handle(request) {
	const u = new URL(request.url);
	const id = u.searchParams.get("id") ?? "";
	const asDownload = u.searchParams.get("dl") === "1";
	const entry = id ? getMedia(id) : null;
	if (!entry) return Response.json({ error: "Media link expired. Open the share again to mint a fresh one." }, { status: 410 });
	const target = entry.directUrl || entry.hlsUrl;
	if (!target) return Response.json({ error: "No media URL on this file." }, { status: 404 });
	return proxyMedia({
		url: target,
		request,
		filename: entry.name,
		referer: entry.referer,
		asDownload,
		publicDirect: Boolean(entry.publicDirect)
	});
}
/** Rewrite a playlist so every segment stays on this origin and is tied to one media id. */
function rewritePlaylist(playlist, base, id, origin) {
	const allow = [];
	const proxied = (abs) => {
		allow.push(abs);
		return `${origin}/api/seg?id=${encodeURIComponent(id)}&u=${encodeURIComponent(abs)}`;
	};
	const lines = playlist.split("\n").map((line) => {
		const trimmed = line.trim();
		if (!trimmed) return line;
		if (trimmed.startsWith("#")) return line.replace(/URI="([^"]+)"/gi, (full, uri) => {
			try {
				return `URI="${proxied(new URL(uri, base).href)}"`;
			} catch {
				return full;
			}
		});
		try {
			return proxied(new URL(trimmed, base).href);
		} catch {
			return line;
		}
	});
	allowSegments(id, allow);
	return lines.join("\n");
}
var Route$6 = createFileRoute("/api/hls")({ server: { handlers: { GET: async ({ request }) => {
	const u = new URL(request.url);
	const id = u.searchParams.get("id") ?? "";
	const uk = u.searchParams.get("uk") ?? "";
	const shareId = u.searchParams.get("shareid") ?? "";
	const fid = u.searchParams.get("fid") ?? "";
	const type = u.searchParams.get("type") ?? "M3U8_AUTO_480";
	let playlist = "";
	if (id) {
		const entry = getMedia(id);
		if (!entry?.hlsUrl) return Response.json({ error: "HLS link expired. Open the share again." }, { status: 410 });
		if (entry.publicDirect) {
			if (!await isPublicHttpUrl(entry.hlsUrl)) return Response.json({ error: "blocked host" }, { status: 400 });
		} else if (!isAllowedCdn(entry.hlsUrl)) return Response.json({ error: "blocked host" }, { status: 400 });
		playlist = await (await fetch(entry.hlsUrl, {
			headers: {
				"user-agent": MEDIA_UA,
				referer: entry.referer || refererFor(entry.hlsUrl, "https://www.teraboxdl.site/"),
				accept: "*/*"
			},
			redirect: "follow"
		})).text();
		if (!playlist.includes("#EXTM3U")) return Response.json({ error: "upstream did not return a playlist" }, { status: 502 });
		if (entry.publicDirect) {
			allowSegments(id, [entry.hlsUrl]);
			const rewritten = rewritePlaylist(playlist, entry.hlsUrl, id, u.origin);
			return new Response(rewritten, { headers: {
				"content-type": "application/vnd.apple.mpegurl",
				"cache-control": "no-store",
				"access-control-allow-origin": "*"
			} });
		}
	} else {
		if (!uk || !shareId || !fid) return Response.json({ error: "uk, shareid, fid or id required" }, { status: 400 });
		const result = await fetchTeraboxPlaylist(uk, shareId, fid, type);
		if ("error" in result) return Response.json({ error: result.error }, { status: 502 });
		playlist = result.playlist;
	}
	const origin = u.origin;
	const rewritten = playlist.split("\n").map((line) => {
		const trimmed = line.trim();
		if (trimmed.startsWith("http")) return `${origin}/api/seg?u=${encodeURIComponent(trimmed)}`;
		return line;
	}).join("\n");
	return new Response(rewritten, { headers: {
		"content-type": "application/vnd.apple.mpegurl",
		"cache-control": "no-store",
		"access-control-allow-origin": "*"
	} });
} } } });
/**
* Streaming ZIP (STORE, no compression). MP4s don't shrink; we just wrap them
* so the browser can save the whole Diskwala pack in one click.
*/
var CRC_TABLE = (() => {
	const t = /* @__PURE__ */ new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(crc, chunk) {
	let c = crc ^ 4294967295;
	for (let i = 0; i < chunk.length; i++) c = CRC_TABLE[(c ^ chunk[i]) & 255] ^ c >>> 8;
	return (c ^ 4294967295) >>> 0;
}
function u16(n) {
	const b = /* @__PURE__ */ new Uint8Array(2);
	new DataView(b.buffer).setUint16(0, n, true);
	return b;
}
function u32(n) {
	const b = /* @__PURE__ */ new Uint8Array(4);
	new DataView(b.buffer).setUint32(0, n >>> 0, true);
	return b;
}
function concat(...parts) {
	const len = parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(len);
	let o = 0;
	for (const p of parts) {
		out.set(p, o);
		o += p.length;
	}
	return out;
}
function safeZipName(name, used) {
	let base = name.replace(/[\\/:*?"<>|]+/g, "_").replace(/^\.+/, "_") || "file";
	if (base.length > 120) {
		const dot = base.lastIndexOf(".");
		const ext = dot > 0 ? base.slice(dot) : "";
		base = base.slice(0, 120 - ext.length) + ext;
	}
	let out = base;
	let i = 2;
	while (used.has(out.toLowerCase())) {
		const dot = base.lastIndexOf(".");
		out = dot > 0 ? `${base.slice(0, dot)}_${i}${base.slice(dot)}` : `${base}_${i}`;
		i++;
	}
	used.add(out.toLowerCase());
	return out;
}
function zipStoreStream(files) {
	return new ReadableStream({ async start(controller) {
		const used = /* @__PURE__ */ new Set();
		const central = [];
		let offset = 0;
		const push = (chunk) => {
			if (chunk.length) controller.enqueue(chunk);
			offset += chunk.length;
		};
		try {
			for (const file of files) {
				const name = safeZipName(file.name, used);
				const nameBytes = new TextEncoder().encode(name);
				const localHeader = concat(u32(67324752), u16(20), u16(2056), u16(0), u16(0), u16(0), u32(0), u32(0), u32(0), u16(nameBytes.length), u16(0), nameBytes);
				const localOffset = offset;
				push(localHeader);
				const body = await file.open();
				let size = 0;
				let crc = 0;
				if (body) {
					const reader = body.getReader();
					for (;;) {
						const { done, value } = await reader.read();
						if (done) break;
						if (!value || !value.length) continue;
						crc = crc32(crc, value);
						size += value.length;
						push(value);
					}
				}
				push(concat(u32(134695760), u32(crc), u32(size), u32(size)));
				central.push(concat(u32(33639248), u16(20), u16(20), u16(2056), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(localOffset), nameBytes));
			}
			const centralStart = offset;
			for (const c of central) push(c);
			const centralSize = offset - centralStart;
			push(concat(u32(101010256), u16(0), u16(0), u16(central.length), u16(central.length), u32(centralSize), u32(centralStart), u16(0)));
			controller.close();
		} catch (err) {
			controller.error(err);
		}
	} });
}
var Route$5 = createFileRoute("/api/pack")({ server: { handlers: {
	OPTIONS: async () => corsPreflight(),
	POST: async ({ request }) => {
		const body = await request.json().catch(() => ({}));
		const url = typeof body.url === "string" ? body.url : "";
		if (!url) return Response.json({
			ok: false,
			error: "url required"
		}, { status: 400 });
		try {
			return Response.json(await resolvePack(url));
		} catch (err) {
			return Response.json({
				ok: false,
				host: "unknown",
				inputUrl: url,
				error: err instanceof Error ? err.message : "Pack collect failed",
				elapsedMs: 0
			}, { status: 200 });
		}
	},
	GET: async ({ request }) => {
		const id = new URL(request.url).searchParams.get("id") ?? "";
		const pack = id ? getPack(id) : null;
		if (!pack) return Response.json({ error: "Pack expired. Collect the folder link again." }, { status: 410 });
		const zipName = `${(pack.title || "folder-pack").replace(/[^\w.\- ]+/g, "_").slice(0, 60)}.zip`;
		const stream = zipStoreStream(pack.files.map((f) => ({
			name: f.name,
			open: async () => {
				const entry = getMedia(f.mediaId);
				const url = entry?.directUrl;
				if (!url || !isAllowedCdn(url)) return null;
				const res = await fetch(url, {
					headers: {
						"user-agent": MEDIA_UA,
						accept: "*/*",
						referer: entry.referer
					},
					redirect: "follow"
				});
				if (!res.ok || !res.body) return null;
				return res.body;
			}
		})));
		return new Response(stream, { headers: {
			"content-type": "application/zip",
			"content-disposition": `attachment; filename="${zipName}"`,
			"cache-control": "no-store"
		} });
	}
} } });
var Route$4 = createFileRoute("/api/resolve")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const url = typeof body.url === "string" ? body.url : "";
	if (!url) return Response.json({
		ok: false,
		error: "url required"
	}, { status: 400 });
	try {
		const result = await resolveShare(url, mergeCookies(getSessionCookie(), body.cookie));
		return Response.json(result);
	} catch (err) {
		return Response.json({
			ok: false,
			host: "unknown",
			inputUrl: url,
			error: err instanceof Error ? err.message : "Resolve failed",
			elapsedMs: 0
		}, { status: 200 });
	}
} } } });
var Route$3 = createFileRoute("/api/seg")({ server: { handlers: {
	OPTIONS: async () => corsPreflight(),
	GET: async ({ request }) => {
		const u = new URL(request.url);
		const target = u.searchParams.get("u");
		const id = u.searchParams.get("id") ?? "";
		if (id) return proxyOwnedSegment(request, id, target, u.origin);
		if (!target || !isAllowedCdn(target)) return new Response("blocked", { status: 400 });
		const range = request.headers.get("range");
		return pipe(await fetch(target, { headers: {
			"user-agent": MEDIA_UA,
			referer: refererFor(target, "https://www.1024tera.com/"),
			...range ? { range } : {}
		} }));
	}
} } });
async function proxyOwnedSegment(request, id, target, origin) {
	const entry = getMedia(id);
	if (!entry?.publicDirect || !target || !segmentAllowed(id, target)) return new Response("blocked", { status: 400 });
	const got = await fetchPublic(target, {
		range: request.headers.get("range"),
		referer: entry.referer
	});
	if (!got) return new Response("blocked", { status: 400 });
	const ctype = got.res.headers.get("content-type") || "";
	if (/text\/html|javascript|\/json/i.test(ctype)) {
		try {
			await got.res.body?.cancel();
		} catch {}
		return new Response("blocked", { status: 415 });
	}
	const path = (() => {
		try {
			return new URL(target).pathname;
		} catch {
			return "";
		}
	})();
	if (/\.m3u8?$/i.test(path) || /mpegurl/i.test(ctype)) {
		const text = await got.res.text();
		if (text.includes("#EXTM3U")) return new Response(rewritePlaylist(text, got.url, id, origin), { headers: {
			"content-type": "application/vnd.apple.mpegurl",
			"cache-control": "no-store",
			"access-control-allow-origin": "*"
		} });
		return new Response(text, {
			status: got.res.status,
			headers: {
				"content-type": ctype || "application/octet-stream",
				"access-control-allow-origin": "*"
			}
		});
	}
	return pipe(got.res);
}
function pipe(res) {
	const headers = new Headers();
	for (const k of [
		"content-type",
		"content-length",
		"content-range",
		"accept-ranges"
	]) {
		const v = res.headers.get(k);
		if (v) headers.set(k, v);
	}
	headers.set("cache-control", "private, max-age=120");
	headers.set("access-control-allow-origin", "*");
	headers.set("access-control-expose-headers", "content-length, content-range, accept-ranges");
	return new Response(res.body, {
		status: res.status,
		headers
	});
}
var Route$2 = createFileRoute("/api/status")({ server: { handlers: { GET: async () => {
	kickRefresh();
	return Response.json(statusPayload());
} } } });
var Route$1 = createFileRoute("/api/thumb")({ server: { handlers: { GET: async ({ request }) => {
	const target = new URL(request.url).searchParams.get("u");
	if (!target || !isAllowedCdn(target)) return new Response("blocked", { status: 400 });
	const res = await fetch(target, { headers: {
		"user-agent": MEDIA_UA,
		referer: refererFor(target, "https://www.1024tera.com/")
	} });
	return new Response(res.body, {
		status: res.status,
		headers: {
			"content-type": res.headers.get("content-type") || "image/jpeg",
			"cache-control": "public, max-age=3600"
		}
	});
} } } });
var _0002_usage_default = "-- Aggregate usage only. No accounts, no pasted links, no cookies.\ncreate table if not exists usage_events (\n  id bigserial primary key,\n  created_at timestamptz not null default now(),\n  kind text not null,\n  host text not null,\n  outcome text not null,\n  file_count integer not null default 0,\n  elapsed_ms integer not null default 0,\n  device text not null default 'desktop'\n);\n\ncreate index if not exists usage_events_created_idx on usage_events (created_at desc);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_usage.sql": _0002_usage_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
var EMPTY = {
	total: 0,
	ok: 0,
	today: 0,
	mobile: 0,
	files: 0,
	hosts: [],
	stored: false,
	backend: dbSource
};
function clampInt(value, min, max) {
	const n = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(n)) return min;
	return Math.max(min, Math.min(max, Math.round(n)));
}
function parseUsage(data) {
	if (!data || typeof data !== "object") return null;
	const d = data;
	const kind = d.kind === "share" || d.kind === "pack" || d.kind === "any" ? d.kind : null;
	if (!kind) return null;
	const host = typeof d.host === "string" ? d.host.toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 120) : "";
	if (!host || host.includes("..") || host.startsWith(".") || host.endsWith(".")) return null;
	const outcome = d.outcome === "ok" || d.outcome === "fail" ? d.outcome : null;
	if (!outcome) return null;
	const device = d.device === "mobile" ? "mobile" : "desktop";
	return {
		kind,
		host,
		outcome,
		fileCount: clampInt(d.fileCount, 0, 500),
		elapsedMs: clampInt(d.elapsedMs, 0, 18e4),
		device
	};
}
var summaryCache = null;
var pruneAt = 0;
async function recordUsage(row) {
	const sql = await getSql();
	await sql`
    insert into usage_events (kind, host, outcome, file_count, elapsed_ms, device)
    values (${row.kind}, ${row.host}, ${row.outcome}, ${row.fileCount}, ${row.elapsedMs}, ${row.device})
  `;
	summaryCache = null;
	const now = Date.now();
	if (now - pruneAt > 36e5) {
		pruneAt = now;
		await sql`delete from usage_events where created_at < now() - interval '90 days'`;
	}
}
function num(value) {
	const n = typeof value === "bigint" ? Number(value) : Number(value);
	return Number.isFinite(n) ? n : 0;
}
async function usageSummary() {
	if (summaryCache && Date.now() - summaryCache.at < 8e3) return summaryCache.data;
	try {
		const sql = await getSql();
		const [row] = await sql`
      select
        count(*) as total,
        count(*) filter (where outcome = 'ok') as ok,
        count(*) filter (where created_at > now() - interval '1 day') as today,
        count(*) filter (where device = 'mobile') as mobile,
        coalesce(sum(file_count), 0) as files
      from usage_events
    `;
		const hosts = await sql`
      select host, count(*) as n
      from usage_events
      group by host
      order by count(*) desc
      limit 5
    `;
		const data = {
			total: num(row?.total),
			ok: num(row?.ok),
			today: num(row?.today),
			mobile: num(row?.mobile),
			files: num(row?.files),
			hosts: hosts.map((h) => ({
				host: String(h.host),
				n: num(h.n)
			})),
			stored: true,
			backend: dbSource
		};
		summaryCache = {
			at: Date.now(),
			data
		};
		return data;
	} catch {
		return EMPTY;
	}
}
var Route = createFileRoute("/api/usage")({ server: { handlers: {
	GET: async () => Response.json(await usageSummary()),
	POST: async ({ request }) => {
		const row = parseUsage(await request.json().catch(() => null));
		if (!row) return new Response(null, { status: 400 });
		await Promise.race([recordUsage(row).catch(() => void 0), new Promise((resolve) => setTimeout(resolve, 1500))]);
		return new Response(null, { status: 204 });
	}
} } });
var rootRouteChildren = {
	IndexRoute: Route$12.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$13
	}),
	AnyRoute: Route$11.update({
		id: "/any",
		path: "/any",
		getParentRoute: () => Route$13
	}),
	GuideRoute: Route$10.update({
		id: "/guide",
		path: "/guide",
		getParentRoute: () => Route$13
	}),
	ApiAnyRoute: Route$9.update({
		id: "/api/any",
		path: "/api/any",
		getParentRoute: () => Route$13
	}),
	ApiDownloadRoute: Route$8.update({
		id: "/api/download",
		path: "/api/download",
		getParentRoute: () => Route$13
	}),
	ApiFileRoute: Route$7.update({
		id: "/api/file",
		path: "/api/file",
		getParentRoute: () => Route$13
	}),
	ApiHlsRoute: Route$6.update({
		id: "/api/hls",
		path: "/api/hls",
		getParentRoute: () => Route$13
	}),
	ApiPackRoute: Route$5.update({
		id: "/api/pack",
		path: "/api/pack",
		getParentRoute: () => Route$13
	}),
	ApiResolveRoute: Route$4.update({
		id: "/api/resolve",
		path: "/api/resolve",
		getParentRoute: () => Route$13
	}),
	ApiSegRoute: Route$3.update({
		id: "/api/seg",
		path: "/api/seg",
		getParentRoute: () => Route$13
	}),
	ApiStatusRoute: Route$2.update({
		id: "/api/status",
		path: "/api/status",
		getParentRoute: () => Route$13
	}),
	ApiThumbRoute: Route$1.update({
		id: "/api/thumb",
		path: "/api/thumb",
		getParentRoute: () => Route$13
	}),
	ApiUsageRoute: Route.update({
		id: "/api/usage",
		path: "/api/usage",
		getParentRoute: () => Route$13
	})
};
var routeTree = Route$13._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { getRouter, router_lF6PbZci_exports as t };
