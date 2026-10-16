import { o as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { i as formatDuration, n as cn, r as formatBytes, t as SiteHeader } from "./site-header-CsBGfoev.mjs";
import { r as detectHost, u as normalizePaste } from "./pack-Buvn6sgS.mjs";
import { n as reportUsage, r as usageHost, t as deviceKind } from "./usage-client-ClE4trGM.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { StreamPlayer } from "./player-D_HsYdrd.mjs";
import { a as Play, c as Download, i as Settings2, l as Clock, o as Package, r as Shield, s as Folder, t as Zap, u as ArrowRight } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CQ3qnlZ4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var resolveLink = createServerFn({ method: "POST" }).validator((data) => {
	const d = data;
	if (!d || typeof d.url !== "string") throw new Error("url is required");
	return {
		url: d.url,
		cookie: typeof d.cookie === "string" ? d.cookie : ""
	};
}).handler(createSsrRpc("ffc520e8b400e7a1527c60d3c12b44b1be372d94ea94656dba372dc51bb07235"));
var resolvePackFn = createServerFn({ method: "POST" }).validator((data) => {
	const d = data;
	if (!d || typeof d.url !== "string") throw new Error("url is required");
	return { url: d.url };
}).handler(createSsrRpc("c3405a470d03952b376ac02526b748f2f076e86ef39ce41b530c90eb3202f311"));
var loginTeraboxFn = createServerFn({ method: "POST" }).validator((data) => {
	const d = data;
	if (!d || typeof d.email !== "string" || typeof d.password !== "string") throw new Error("email and password are required");
	return {
		email: d.email,
		password: d.password
	};
}).handler(createSsrRpc("fa2b083eb6a18e09bfab3d516966e429dc1a0607251a3d58a6aa1d71efb1440b"));
var sessionStatusFn = createServerFn({ method: "POST" }).validator(() => ({})).handler(createSsrRpc("a3bed3e8921afa9af61596f203ef96f21414e7bee5b6ba2d2e1d721dcefcad13"));
var logoutTeraboxFn = createServerFn({ method: "POST" }).validator(() => ({})).handler(createSsrRpc("b334cfa2265f8fec1b9ebbce53b186d3094d596c67cf3ff73138a9f044e37051"));
var KEY = "skipper.history.v1";
var COOKIE_KEY = "skipper.ndus";
var MAX = 12;
function loadHistory() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, MAX) : [];
	} catch {
		return [];
	}
}
function pushHistory(item) {
	const next = [item, ...loadHistory().filter((h) => h.url !== item.url)].slice(0, MAX);
	localStorage.setItem(KEY, JSON.stringify(next));
	return next;
}
function clearHistory() {
	localStorage.removeItem(KEY);
}
function loadCookie() {
	if (typeof window === "undefined") return "";
	return localStorage.getItem(COOKIE_KEY) ?? "";
}
function saveCookie(value) {
	if (!value.trim()) localStorage.removeItem(COOKIE_KEY);
	else localStorage.setItem(COOKIE_KEY, value.trim());
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium transition-opacity duration-150 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-elevated text-fg border border-border hover:bg-surface",
			ghost: "text-muted hover:text-fg hover:bg-elevated"
		},
		size: {
			sm: "h-9 px-3 text-sm rounded-sm",
			md: "h-11 px-4 text-sm rounded-md",
			lg: "h-12 px-5 text-base rounded-md",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function FileCard({ file, onPlay }) {
	const thumb = file.thumbnail ? `/api/thumb?u=${encodeURIComponent(file.thumbnail)}` : null;
	const downloadHref = buildDownloadHref(file);
	const canPlay = file.canStream || Boolean(file.directUrl || file.hlsUrl || file.mediaId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "flex flex-col overflow-hidden rounded-lg border border-border bg-surface sm:flex-row",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "relative aspect-video w-full shrink-0 bg-elevated sm:aspect-auto sm:w-44",
			children: thumb ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: thumb,
				alt: "",
				className: "size-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex size-full min-h-28 items-center justify-center text-subtle",
				children: file.isDir ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Folder, { className: "size-8" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-8" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 flex-col gap-3 p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "truncate text-base font-medium text-fg",
					title: file.name,
					children: file.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: file.isDir ? "Folder" : formatBytes(file.size) }),
						file.duration ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDuration(file.duration) }) : null,
						file.width && file.height ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							file.width,
							"×",
							file.height
						] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "uppercase tracking-wide",
							children: file.host
						}),
						file.originalReady ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-ok",
							children: "Original ready"
						}) : null
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-auto flex flex-wrap gap-2",
				children: [canPlay ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					onClick: () => onPlay(file),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "size-4" }), "Play"]
				}) : null, !file.isDir && downloadHref ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
					href: downloadHref,
					download: file.name,
					className: cn(buttonVariants({
						variant: "secondary",
						size: "sm"
					})),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), "Download"]
				}) : null]
			})]
		})]
	});
}
function buildDownloadHref(file) {
	if (file.mediaId) return `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`;
	if (file.uk && file.shareId && file.fsId) return `/api/download?${new URLSearchParams({
		name: file.name,
		uk: file.uk,
		shareid: file.shareId,
		fid: file.fsId,
		mode: "stream"
	}).toString()}`;
	return null;
}
var EXAMPLES = [
	{
		label: "TeraBox sample",
		url: "https://1024tera.com/s/16-BFJ6KJhZEBpv_vhNsD6w"
	},
	{
		label: "Diskwala sample",
		url: "https://www.diskwala.com/app/6ab3fbfd2a52418b24e638cd"
	},
	{
		label: "Blatim sample",
		url: "https://www.blatim.com/watch/lnGRKC5SxCbIy6yW"
	}
];
function Home() {
	const [url, setUrl] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	const [playing, setPlaying] = (0, import_react.useState)(null);
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [cookie, setCookie] = (0, import_react.useState)(() => typeof window === "undefined" ? "" : loadCookie());
	const [history, setHistory] = (0, import_react.useState)(() => typeof window === "undefined" ? [] : loadHistory());
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [loginBusy, setLoginBusy] = (0, import_react.useState)(false);
	const [loginMsg, setLoginMsg] = (0, import_react.useState)(null);
	const [session, setSession] = (0, import_react.useState)({
		active: false,
		emailMasked: "",
		ndusTail: ""
	});
	const [packUrl, setPackUrl] = (0, import_react.useState)("");
	const [packBusy, setPackBusy] = (0, import_react.useState)(false);
	const [pack, setPack] = (0, import_react.useState)(null);
	const [savingEach, setSavingEach] = (0, import_react.useState)(false);
	const [pulses, setPulses] = (0, import_react.useState)([]);
	const [engineNote, setEngineNote] = (0, import_react.useState)("");
	const host = (0, import_react.useMemo)(() => url.trim() ? detectHost(normalizePaste(url)) : "unknown", [url]);
	(0, import_react.useEffect)(() => {
		sessionStatusFn({ data: {} }).then(setSession).catch(() => void 0);
		let stop = false;
		let n = 0;
		async function tick() {
			try {
				const data = await fetch("/api/status").then((r) => r.json());
				if (stop) return;
				if (Array.isArray(data.hosts)) setPulses(data.hosts);
				if (data.checkedAt && typeof data.summary === "string") setEngineNote(data.summary);
				const pending = Boolean(data.learning) || (data.hosts || []).some((h) => h.state === "unknown");
				n += 1;
				if (pending && n < 6) window.setTimeout(tick, 8e3);
			} catch {}
		}
		tick();
		return () => {
			stop = true;
		};
	}, []);
	async function run(nextUrl = url) {
		const trimmed = normalizePaste(nextUrl);
		if (!trimmed) return;
		setUrl(trimmed);
		setBusy(true);
		setResult(null);
		try {
			const data = await resolveLink({ data: {
				url: trimmed,
				cookie
			} });
			setResult(data);
			reportUsage({
				kind: "share",
				host: usageHost(trimmed),
				outcome: data.ok ? "ok" : "fail",
				fileCount: data.ok ? data.files.length : 0,
				elapsedMs: data.elapsedMs || 0,
				device: deviceKind()
			});
			if (data.ok) setHistory(pushHistory({
				url: trimmed,
				title: data.title,
				host: data.host,
				at: Date.now(),
				fileCount: data.files.length
			}));
		} catch (err) {
			setResult({
				ok: false,
				host: detectHost(trimmed),
				inputUrl: trimmed,
				error: err instanceof Error ? err.message : "Resolve failed",
				elapsedMs: 0
			});
		} finally {
			setBusy(false);
		}
	}
	async function doLogin() {
		setLoginBusy(true);
		setLoginMsg(null);
		try {
			const res = await loginTeraboxFn({ data: {
				email,
				password
			} });
			if (res.ok) {
				setSession({
					active: true,
					emailMasked: res.emailMasked,
					ndusTail: res.ndusTail
				});
				setCookie(res.cookie);
				saveCookie(res.cookie);
				setPassword("");
				setLoginMsg(`Signed in as ${res.emailMasked}. Original TeraBox downloads can use this session.`);
			} else setLoginMsg(res.error + (res.hint ? ` ${res.hint}` : ""));
		} catch (err) {
			setLoginMsg(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoginBusy(false);
		}
	}
	async function runPack(nextUrl = packUrl) {
		const trimmed = normalizePaste(nextUrl);
		if (!trimmed) return;
		setPackUrl(trimmed);
		setPackBusy(true);
		setPack(null);
		try {
			const data = await resolvePackFn({ data: { url: trimmed } });
			setPack(data);
			reportUsage({
				kind: "pack",
				host: usageHost(trimmed),
				outcome: data.ok ? "ok" : "fail",
				fileCount: data.ok ? data.files.length : 0,
				elapsedMs: data.elapsedMs || 0,
				device: deviceKind()
			});
		} catch (err) {
			setPack({
				ok: false,
				host: detectHost(trimmed),
				inputUrl: trimmed,
				error: err instanceof Error ? err.message : "Pack collect failed",
				elapsedMs: 0
			});
		} finally {
			setPackBusy(false);
		}
	}
	async function saveEach() {
		if (!pack || !pack.ok) return;
		setSavingEach(true);
		try {
			for (const file of pack.files) {
				if (!file.mediaId) continue;
				const a = document.createElement("a");
				a.href = `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`;
				a.download = file.name;
				a.rel = "noopener";
				document.body.appendChild(a);
				a.click();
				a.remove();
				await new Promise((r) => setTimeout(r, 700));
			}
		} finally {
			setSavingEach(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {
				active: "home",
				extra: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setSettingsOpen((v) => !v),
					className: "inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-fg",
					"aria-label": "Settings",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-5" })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex max-w-3xl flex-col gap-10 px-5 pb-24",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-5 pt-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm uppercase tracking-[0.18em] text-muted",
								children: "TeraBox · Diskwala · Blatim"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "font-display text-4xl leading-tight tracking-tight text-fg sm:text-5xl",
								children: [
									"Paste the link.",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"Skip the ads."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "max-w-xl text-base leading-relaxed text-muted",
								children: "Public share pages bury the file behind timers, app installs and popups. Skipper reads the share on the server, lists every file, and plays or downloads the original — no TeraBox app, no Diskwala install, no Blatim / Broadcaster login, no ads. Paste a messy Telegram post, a teraboxlinke.com/v/ hop, or a folder link in Pack below. For a normal website, use Any video in the header."
							}),
							pulses.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex flex-wrap gap-2",
								children: pulses.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-muted",
									title: p.note,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: p.state === "live" ? "text-ok" : p.state === "down" ? "text-fg" : "text-muted",
											children: p.state === "live" ? "Live" : p.state === "down" ? "Down" : p.state === "slow" ? "Slow" : "…"
										}),
										" ",
										p.host
									]
								}, p.host))
							}) : null,
							engineNote ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "max-w-xl text-sm leading-relaxed text-muted",
								children: engineNote
							}) : null
						]
					}),
					settingsOpen ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-6 rounded-lg border border-border bg-surface p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-sm font-medium text-fg",
								children: "TeraBox account (optional)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-sm leading-relaxed text-muted",
								children: [
									"Listing, Play and Download already work without an account via a public original-file worker. Signing in mints an ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono",
										children: "ndus"
									}),
									" cookie so Skipper can also hit TeraBox's own download API. The password is sent once, never stored. TeraBox may show a slide captcha — if it does, paste ndus from your browser instead."
								]
							}),
							session.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-3 text-sm text-ok",
								children: [
									"Session active",
									session.emailMasked ? ` · ${session.emailMasked}` : "",
									" · ndus …",
									session.ndusTail
								]
							}) : null,
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid gap-3 sm:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "email",
									autoComplete: "username",
									value: email,
									onChange: (e) => setEmail(e.target.value),
									placeholder: "TeraBox email",
									className: "h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:outline-2 focus:outline-accent"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									autoComplete: "current-password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									placeholder: "Password",
									className: "h-11 rounded-md border border-border bg-bg px-3 text-sm text-fg outline-none focus:outline-2 focus:outline-accent"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									size: "sm",
									disabled: loginBusy || !email || !password,
									onClick: () => void doLogin(),
									children: loginBusy ? "Signing in…" : "Sign in and harvest ndus"
								}), session.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									size: "sm",
									variant: "ghost",
									onClick: () => {
										logoutTeraboxFn({ data: {} });
										setSession({
											active: false,
											emailMasked: "",
											ndusTail: ""
										});
									},
									children: "Sign out"
								}) : null]
							}),
							loginMsg ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-muted",
								children: loginMsg
							}) : null
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-sm font-medium text-fg",
								children: "Or paste an ndus cookie"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-2 text-sm leading-relaxed text-muted",
								children: [
									"From a browser already logged into TeraBox: DevTools → Application → Cookies →",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono",
										children: "ndus"
									}),
									". Stored in this browser only."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: cookie,
								onChange: (e) => setCookie(e.target.value),
								placeholder: "ndus=Y……",
								rows: 3,
								className: "mt-4 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none focus:outline-2 focus:outline-accent"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									size: "sm",
									onClick: () => {
										saveCookie(cookie);
										setSettingsOpen(false);
									},
									children: "Save"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									size: "sm",
									variant: "ghost",
									onClick: () => {
										setCookie("");
										saveCookie("");
									},
									children: "Clear"
								})]
							})
						] })]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "flex flex-col gap-3",
						onSubmit: (e) => {
							e.preventDefault();
							run(e.currentTarget.elements.namedItem("share-url")?.value || url);
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-sm text-muted",
								htmlFor: "share-url",
								children: "Share link"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-3 sm:flex-row",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									id: "share-url",
									name: "share-url",
									value: url,
									onChange: (e) => setUrl(e.target.value),
									onPaste: (e) => {
										const text = e.clipboardData.getData("text");
										const picked = normalizePaste(text);
										if (!picked) return;
										e.preventDefault();
										setUrl(picked);
										run(picked);
									},
									placeholder: "Paste TeraBox, Diskwala, Blatim or a Telegram post…",
									autoComplete: "off",
									spellCheck: false,
									className: "h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-4 text-base text-fg outline-none placeholder:text-subtle focus:outline-2 focus:outline-offset-0 focus:outline-accent"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "submit",
									size: "lg",
									disabled: busy || !url.trim(),
									className: "sm:w-40",
									children: [busy ? "Opening…" : "Open", !busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4" }) : null]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: host === "unknown" && url.trim() ? "Looking for a share URL in that paste…" : host === "terabox" ? "TeraBox share — every mirror (/s/ and /v/), original file on the first Open." : host === "diskwala" ? "Diskwala share — Skipper skips their fake 404 and races /app plus /playlist for albums." : host === "blatim" ? "Blatim watch — Skipper reads /api/video info (no app, no ads) and follows the original VidBunker / TeraBox / Diskwala file." : host === "telegram" ? "Telegram post — Skipper reads the public preview and opens the nested TeraBox / Diskwala / Blatim link." : "Supports TeraBox (all mirrors), Diskwala, Blatim and Telegram pastes."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: EXAMPLES.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void run(ex.url),
							className: "h-9 rounded-full border border-border px-3 text-sm text-muted hover:border-accent hover:text-fg",
							children: ex.label
						}, ex.url))
					}),
					busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-3",
						"aria-live": "polite",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-28 animate-pulse rounded-lg bg-surface" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Reading the share and minting the original file…"
						})]
					}) : null,
					result && !result.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-surface p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium text-fg",
							children: result.error
						}), result.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted",
							children: result.hint
						}) : null]
					}) : null,
					result && result.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-end justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs uppercase tracking-widest text-muted",
									children: result.host
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "mt-1 font-display text-2xl text-fg",
									children: result.title
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-subtle",
									children: [result.elapsedMs, " ms"]
								})]
							}),
							result.warnings.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: w
							}, w)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col gap-3",
								children: result.files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCard, {
									file,
									onPlay: setPlaying
								}, file.id + file.path))
							})
						]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-5 rounded-xl border border-border bg-surface p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated text-muted",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "size-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs uppercase tracking-[0.18em] text-muted",
											children: "TeraBox · Diskwala · Blatim"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "mt-1 font-display text-2xl tracking-tight text-fg",
											children: "Folder Pack"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 text-sm leading-relaxed text-muted",
											children: "Paste one public share. Pack pages every folder that share published — TeraBox extra pages and nested folders, Diskwala albums on the same storage, or a Blatim watch that wraps those hosts. Play any file or zip the tree. The rest of that uploader’s account is private and is not opened."
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								className: "flex flex-col gap-3",
								onSubmit: (e) => {
									e.preventDefault();
									runPack(e.currentTarget.elements.namedItem("pack-url")?.value || packUrl);
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-sm text-muted",
										htmlFor: "pack-url",
										children: "Folder or album link"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col gap-3 sm:flex-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											id: "pack-url",
											name: "pack-url",
											value: packUrl,
											onChange: (e) => setPackUrl(e.target.value),
											onPaste: (e) => {
												const text = e.clipboardData.getData("text");
												const picked = normalizePaste(text);
												if (!picked) return;
												e.preventDefault();
												setPackUrl(picked);
												runPack(picked);
											},
											placeholder: "Paste a folder, album, Telegram post or watch link…",
											autoComplete: "off",
											spellCheck: false,
											className: "h-12 min-w-0 flex-1 rounded-md border border-border bg-bg px-4 text-base text-fg outline-none placeholder:text-subtle focus:outline-2 focus:outline-offset-0 focus:outline-accent"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											type: "submit",
											size: "lg",
											disabled: packBusy || !packUrl.trim(),
											className: "sm:w-44",
											children: [packBusy ? "Collecting…" : "Collect pack", !packBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "size-4" }) : null]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-2",
										children: EXAMPLES.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void runPack(ex.url),
											className: "h-9 rounded-full border border-border px-3 text-sm text-muted hover:border-accent hover:text-fg",
											children: ex.label
										}, `pack-${ex.url}`))
									})
								]
							}),
							packBusy ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-3",
								"aria-live": "polite",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-20 animate-pulse rounded-lg bg-elevated" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted",
									children: "Walking the album and minting every original file…"
								})]
							}) : null,
							pack && !pack.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-md border border-border bg-bg p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-medium text-fg",
									children: pack.error
								}), pack.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-2 text-sm leading-relaxed text-muted",
									children: pack.hint
								}) : null]
							}) : null,
							pack && pack.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-end justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs uppercase tracking-widest text-muted",
											children: [
												pack.files.length,
												" file",
												pack.files.length === 1 ? "" : "s",
												pack.totalBytes ? ` · ${formatBytes(pack.totalBytes)}` : ""
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
											className: "mt-1 font-display text-xl text-fg",
											children: pack.title
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-sm text-subtle",
											children: [pack.elapsedMs, " ms"]
										})]
									}),
									pack.warnings.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-muted",
										children: w
									}, w)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap gap-2",
										children: [pack.packId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: `/api/pack?id=${encodeURIComponent(pack.packId)}`,
											download: `${pack.title || "folder-pack"}.zip`,
											className: cn("inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Package, { className: "size-4" }), "Download all as zip"]
										}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											size: "sm",
											variant: "secondary",
											disabled: savingEach,
											onClick: () => void saveEach(),
											children: savingEach ? "Saving…" : "Save each file"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-subtle",
										children: "Zip is one click. Save each asks the browser to download originals one after another — allow multiple downloads if it prompts."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-col gap-3",
										children: pack.files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileCard, {
											file,
											onPlay: setPlaying
										}, file.id + file.path))
									})
								]
							}) : null
						]
					}),
					history.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "flex items-center gap-2 text-sm font-medium text-muted",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "size-4" }), "Recent"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "text-sm text-subtle hover:text-fg",
								onClick: () => {
									clearHistory();
									setHistory([]);
								},
								children: "Clear"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col gap-1",
							children: history.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void run(h.url),
								className: cn("flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left hover:bg-surface"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "min-w-0 truncate text-sm text-fg",
									children: h.title
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 text-xs uppercase text-subtle",
									children: h.host
								})]
							}) }, h.url))
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "grid gap-4 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "size-4" }),
								title: "Original file, no login",
								body: "A public worker already holds a TeraBox cookie pool. We mint a direct MP4 (Range + full size) and stream it through Skipper so Play actually plays."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-4" }),
								title: "Same-origin proxy",
								body: "Bytes are piped from the CDN through this app so the player is not blocked by attachment headers or iframe download rules."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fact, {
								icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "size-4" }),
								title: "Account is optional",
								body: "Email + password in Settings harvests ndus for TeraBox's own API. Captcha may block that path. Public Play/Download does not need it."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-center text-sm text-subtle",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/skipper-source.zip",
								className: "hover:text-fg",
								children: "Download source"
							}),
							" · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/docs/AI_HANDOFF_PROMPT.md",
								className: "hover:text-fg",
								children: "Handoff for the next builder"
							}),
							" · ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: "/docs/COMPLETE_BUILD_GUIDE.md",
								className: "hover:text-fg",
								children: "A–Z guide"
							})
						]
					})
				]
			}),
			playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamPlayer, {
				file: playing,
				onClose: () => setPlaying(null)
			}) : null
		]
	});
}
function Fact({ icon, title, body }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-muted",
				children: icon
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mt-3 text-sm font-medium text-fg",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm leading-relaxed text-muted",
				children: body
			})
		]
	});
}
//#endregion
export { Home as component };
