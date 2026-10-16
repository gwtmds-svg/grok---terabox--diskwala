//#region node_modules/.nitro/vite/services/ssr/assets/usage-client-ClE4trGM.js
function usageHost(input) {
	try {
		return new URL(input).hostname.replace(/^www\./, "").slice(0, 120);
	} catch {
		return "unknown";
	}
}
function deviceKind() {
	if (typeof window === "undefined") return "desktop";
	return window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
}
/** Fire after the result is already on screen so it never delays the first paste. */
function reportUsage(input) {
	return fetch("/api/usage", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(input),
		keepalive: true
	}).then(() => void 0).catch(() => void 0);
}
//#endregion
export { reportUsage as n, usageHost as r, deviceKind as t };
