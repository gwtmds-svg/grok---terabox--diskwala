import { x as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/site-header-CsBGfoev.js
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "—";
	const units = [
		"B",
		"KB",
		"MB",
		"GB",
		"TB"
	];
	const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
	const value = bytes / 1024 ** i;
	return `${value >= 10 || i === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[i]}`;
}
function formatDuration(seconds) {
	if (!Number.isFinite(seconds) || seconds <= 0) return "";
	const s = Math.round(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor(s % 3600 / 60);
	const r = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
	return `${m}:${String(r).padStart(2, "0")}`;
}
var LINKS = [{
	to: "/any",
	label: "Any video",
	id: "any"
}, {
	to: "/guide",
	label: "Guide",
	id: "guide"
}];
function SiteHeader({ active, extra }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/",
			className: "shrink-0 font-display text-xl tracking-tight text-fg",
			children: "Skipper"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
			className: "flex items-center",
			children: [LINKS.map((link) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: link.to,
				className: cn("inline-flex h-11 items-center px-2.5 text-sm sm:px-3", active === link.id ? "text-fg" : "text-muted hover:text-fg"),
				children: link.label
			}, link.id)), extra]
		})]
	});
}
//#endregion
export { formatDuration as i, cn as n, formatBytes as r, SiteHeader as t };
