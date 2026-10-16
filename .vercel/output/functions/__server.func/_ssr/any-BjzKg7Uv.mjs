import { o as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteHeader } from "./site-header-CsBGfoev.mjs";
import { u as normalizePaste } from "./pack-Buvn6sgS.mjs";
import { n as reportUsage, r as usageHost, t as deviceKind } from "./usage-client-ClE4trGM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/any-BjzKg7Uv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var StreamPlayer = (0, import_react.lazy)(() => import("./player-D_HsYdrd.mjs").then((m) => ({ default: m.StreamPlayer })));
var SAMPLE_FILE = "https://www.w3schools.com/html/mov_bbb.mp4";
var SAMPLE_PAGE = "https://www.w3schools.com/html/html5_video.asp";
function AnyVideo() {
	const [url, setUrl] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [result, setResult] = (0, import_react.useState)(null);
	const [playing, setPlaying] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [stats, setStats] = (0, import_react.useState)(null);
	function loadStats() {
		fetch("/api/usage").then((r) => r.json()).then((data) => setStats(data)).catch(() => void 0);
	}
	(0, import_react.useEffect)(() => {
		const timer = window.setTimeout(loadStats, 12e3);
		return () => window.clearTimeout(timer);
	}, []);
	async function run(next = url) {
		const trimmed = normalizePaste(next);
		if (!trimmed) return;
		setUrl(trimmed);
		setBusy(true);
		setResult(null);
		setPlaying(null);
		const started = Date.now();
		try {
			const data = await fetch("/api/any", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url: trimmed })
			}).then((r) => r.json());
			setResult(data);
			reportUsage({
				kind: "any",
				host: usageHost(trimmed),
				outcome: data.ok ? "ok" : "fail",
				fileCount: data.ok ? data.files.length : 0,
				elapsedMs: data.elapsedMs || Date.now() - started,
				device: deviceKind()
			}).then(loadStats);
		} catch (err) {
			setResult({
				ok: false,
				host: "unknown",
				inputUrl: trimmed,
				error: err instanceof Error ? err.message : "Could not read that page.",
				elapsedMs: Date.now() - started
			});
		} finally {
			setBusy(false);
		}
	}
	async function saveAll() {
		if (!result?.ok) return;
		setSaving(true);
		try {
			for (const file of result.files) {
				if (!file.mediaId) continue;
				const a = document.createElement("a");
				a.href = `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`;
				a.download = file.name;
				a.rel = "noopener";
				document.body.appendChild(a);
				a.click();
				a.remove();
				await new Promise((r) => setTimeout(r, 450));
			}
		} finally {
			setSaving(false);
		}
	}
	const files = result?.ok ? result.files : [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { active: "any" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-24 sm:px-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-4 pt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm uppercase tracking-[0.18em] text-muted",
								children: "Public video files"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
								className: "font-display text-4xl leading-tight tracking-tight sm:text-5xl",
								children: [
									"Any page.",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"Every video on it."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "max-w-xl text-base leading-relaxed text-muted",
								children: "Paste a normal link. Skipper reads that page and lists every video file it publishes — then plays or downloads them here. No account. Direct .mp4, .webm, and .m3u8 links work on the first paste."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "flex flex-col gap-3 sm:flex-row",
						onSubmit: (e) => {
							e.preventDefault();
							run();
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "sr-only",
								htmlFor: "any-url",
								children: "Video or page link"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "any-url",
								value: url,
								onChange: (e) => setUrl(e.target.value),
								onPaste: (e) => {
									const text = e.clipboardData.getData("text");
									if (!text.trim()) return;
									e.preventDefault();
									setUrl(text);
									run(text);
								},
								placeholder: "https://… page or video file",
								inputMode: "url",
								autoCapitalize: "none",
								autoCorrect: "off",
								spellCheck: false,
								enterKeyHint: "search",
								className: "h-12 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-base text-fg outline-none placeholder:text-subtle focus:border-accent"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: busy || !url.trim(),
								className: "h-12 shrink-0 rounded-md bg-accent px-5 text-sm font-medium text-accent-fg disabled:opacity-50",
								children: busy ? "Reading…" : "Find videos"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void run(SAMPLE_FILE),
							className: "inline-flex h-11 items-center rounded-full border border-border px-3 text-sm text-muted hover:text-fg",
							children: "Try a sample file"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => void run(SAMPLE_PAGE),
							className: "inline-flex h-11 items-center rounded-full border border-border px-3 text-sm text-muted hover:text-fg",
							children: "Try a sample page"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "grid grid-cols-3 gap-2",
						"aria-label": "Usage",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Today",
								value: stats ? String(stats.today) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Worked",
								value: stats ? String(stats.ok) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								label: "Files",
								value: stats ? String(stats.files) : "—"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm leading-relaxed text-muted",
						children: [
							stats?.backend === "neon" ? "Counts are stored in your database." : "Counts stay on this server until you host and connect a database.",
							" ",
							"Only the site name, whether it worked, and how fast — never the link.",
							stats?.hosts?.length ? ` Recent: ${stats.hosts.map((h) => h.host).join(", ")}.` : ""
						]
					}),
					busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Reading the page…"
					}) : null,
					result && !result.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-surface p-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-base text-fg",
							children: result.error
						}), result.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted",
							children: result.hint
						}) : null]
					}) : null,
					result?.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "flex flex-col gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "truncate font-display text-2xl text-fg",
										children: result.title
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: [
											files.length,
											" video",
											files.length === 1 ? "" : "s",
											" · ",
											result.elapsedMs,
											" ms"
										]
									})]
								}), files.filter((f) => f.mediaId).length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void saveAll(),
									disabled: saving,
									className: "h-11 rounded-md border border-border px-4 text-sm text-fg disabled:opacity-50",
									children: saving ? "Saving…" : "Download all"
								}) : null]
							}),
							result.warnings.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm leading-relaxed text-muted",
								children: w
							}, w)),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "flex flex-col gap-3",
								children: files.map((file) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-base text-fg",
											title: file.name,
											children: file.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-sm text-muted",
											children: file.hlsUrl && !file.directUrl ? "Stream" : "Video file"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											disabled: !file.canStream || !file.mediaId,
											onClick: () => setPlaying(file),
											className: "h-11 rounded-md bg-accent text-sm font-medium text-accent-fg disabled:opacity-50",
											children: "Play"
										}), file.mediaId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1`,
											download: file.name,
											className: "inline-flex h-11 items-center justify-center rounded-md border border-border text-sm text-fg",
											children: "Download"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "inline-flex h-11 items-center justify-center text-sm text-muted",
											children: "No file"
										})]
									})]
								}, file.id))
							})
						]
					}) : null
				]
			}),
			playing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
				fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 text-fg",
					children: "Opening player…"
				}),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreamPlayer, {
					file: playing,
					onClose: () => setPlaying(null)
				})
			}) : null
		]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-surface px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs uppercase tracking-wide text-muted",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 font-display text-2xl text-fg",
			children: value
		})]
	});
}
//#endregion
export { AnyVideo as component };
