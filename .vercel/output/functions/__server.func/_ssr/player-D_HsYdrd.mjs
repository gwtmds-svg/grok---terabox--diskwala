import { o as __toESM } from "../_runtime.mjs";
import { J as require_react, x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as formatDuration, r as formatBytes } from "./site-header-CsBGfoev.mjs";
import { t as Hls } from "../_libs/hls.js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/player-D_HsYdrd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function StreamPlayer({ file, onClose }) {
	const ref = (0, import_react.useRef)(null);
	const [status, setStatus] = (0, import_react.useState)("Loading original…");
	const [failed, setFailed] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const video = ref.current;
		if (!video) return;
		let hls = null;
		let cancelled = false;
		let attempt = 0;
		const sources = buildSources(file);
		const setSrcDirect = (url) => {
			video.src = url;
			video.play().catch(() => {});
		};
		const setSrcHls = (url) => {
			if (video.canPlayType("application/vnd.apple.mpegurl")) {
				setSrcDirect(url);
				return;
			}
			if (!Hls.isSupported()) {
				setFailed("This browser cannot play HLS.");
				return;
			}
			hls?.destroy();
			hls = new Hls({
				enableWorker: true,
				lowLatencyMode: false,
				maxBufferLength: 60,
				startLevel: -1
			});
			hls.on(Hls.Events.ERROR, (_evt, data) => {
				if (data.fatal) tryNext();
			});
			hls.loadSource(url);
			hls.attachMedia(video);
		};
		const tryNext = () => {
			if (cancelled) return;
			const next = sources[attempt++];
			if (!next) {
				setFailed("Could not start playback. Try Download — it saves the original file.");
				setStatus("Playback failed");
				return;
			}
			setStatus(next.label);
			setFailed(null);
			if (next.kind === "hls") setSrcHls(next.url);
			else setSrcDirect(next.url);
		};
		const onError = () => tryNext();
		const onMeta = () => {
			const d = video.duration;
			const nice = Number.isFinite(d) && d > 0 ? formatDuration(d) : "";
			setStatus(nice ? `Playing${nice ? ` · ${nice}` : ""}` : "Playing");
		};
		video.addEventListener("error", onError);
		video.addEventListener("loadedmetadata", onMeta);
		tryNext();
		return () => {
			cancelled = true;
			video.removeEventListener("error", onError);
			video.removeEventListener("loadedmetadata", onMeta);
			hls?.destroy();
			video.removeAttribute("src");
			video.load();
		};
	}, [file]);
	const downloadHref = file.mediaId ? `/api/file?id=${encodeURIComponent(file.mediaId)}&dl=1` : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full max-w-4xl flex-col gap-3 rounded-xl bg-surface p-4 shadow-2xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate font-display text-lg text-fg",
							children: file.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [status, file.size ? ` · ${formatBytes(file.size)}` : ""]
						}),
						failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted",
							children: failed
						}) : null
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex shrink-0 items-center gap-2",
					children: [downloadHref ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: downloadHref,
						download: file.name,
						className: "inline-flex h-11 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg",
						children: "Download"
					}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "size-11 shrink-0 rounded-md text-muted hover:bg-elevated hover:text-fg",
						"aria-label": "Close player",
						children: "Close"
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
				ref,
				controls: true,
				autoPlay: true,
				playsInline: true,
				preload: "auto",
				className: "aspect-video w-full rounded-md bg-bg"
			})]
		})
	});
}
function buildSources(file) {
	const out = [];
	if (file.mediaId && file.directUrl) out.push({
		url: `/api/file?id=${encodeURIComponent(file.mediaId)}`,
		kind: "mp4",
		label: "Loading original file…"
	});
	if (file.mediaId && file.hlsUrl) out.push({
		url: `/api/hls?id=${encodeURIComponent(file.mediaId)}`,
		kind: "hls",
		label: "Loading full stream…"
	});
	if (file.uk && file.shareId && file.fsId) {
		const q = new URLSearchParams({
			uk: file.uk,
			shareid: file.shareId,
			fid: file.fsId
		});
		out.push({
			url: `/api/hls?${q.toString()}`,
			kind: "hls",
			label: "Loading preview stream…"
		});
	}
	return out;
}
//#endregion
export { StreamPlayer };
