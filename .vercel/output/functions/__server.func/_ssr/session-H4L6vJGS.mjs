//#region node_modules/.nitro/vite/services/ssr/assets/session-H4L6vJGS.js
/**
* Server-side TeraBox session. Filled by email/password login (Playwright)
* or by a pasted ndus. Never stores the password. Lost on process restart
* unless the client also saved ndus in localStorage and sends it back.
*/
var cookieHeader = "";
var emailMasked = "";
var savedAt = 0;
function maskEmail(email) {
	const [user, domain] = email.split("@");
	if (!user || !domain) return "account";
	return `${user.length <= 2 ? `${user[0] ?? "*"}*` : `${user.slice(0, 2)}…`}@${domain}`;
}
function setSessionCookie(cookie, email = "") {
	cookieHeader = cookie.split(";").map((p) => p.trim()).filter(Boolean).join("; ");
	if (email) emailMasked = maskEmail(email);
	savedAt = cookieHeader ? Date.now() : 0;
}
function getSessionCookie() {
	return cookieHeader;
}
function clearSession() {
	cookieHeader = "";
	emailMasked = "";
	savedAt = 0;
}
function sessionInfo() {
	const ndus = cookieHeader.match(/(?:^|;\s*)ndus=([^;]+)/i)?.[1] ?? "";
	return {
		active: Boolean(ndus),
		emailMasked,
		ndusTail: ndus ? ndus.slice(-8) : "",
		ageMs: savedAt ? Date.now() - savedAt : 0
	};
}
function mergeCookies(...parts) {
	const map = /* @__PURE__ */ new Map();
	for (const part of parts) {
		if (!part) continue;
		for (const pair of part.split(";")) {
			const trimmed = pair.trim();
			const eq = trimmed.indexOf("=");
			if (eq <= 0) continue;
			map.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1));
		}
	}
	return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
//#endregion
export { setSessionCookie as a, sessionInfo as i, getSessionCookie as n, mergeCookies as r, clearSession as t };
