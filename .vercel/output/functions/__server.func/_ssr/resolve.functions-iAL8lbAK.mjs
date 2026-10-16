import { m as resolveShare, p as resolvePack } from "./pack-Buvn6sgS.mjs";
import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { n as getSessionCookie, r as mergeCookies } from "./session-H4L6vJGS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/resolve.functions-iAL8lbAK.js
var resolveLink_createServerFn_handler = createServerRpc({
	id: "ffc520e8b400e7a1527c60d3c12b44b1be372d94ea94656dba372dc51bb07235",
	name: "resolveLink",
	filename: "src/lib/extractors/resolve.functions.ts"
}, (opts) => resolveLink.__executeServer(opts));
var resolveLink = createServerFn({ method: "POST" }).validator((data) => {
	const d = data;
	if (!d || typeof d.url !== "string") throw new Error("url is required");
	return {
		url: d.url,
		cookie: typeof d.cookie === "string" ? d.cookie : ""
	};
}).handler(resolveLink_createServerFn_handler, async ({ data }) => {
	const cookie = mergeCookies(getSessionCookie(), data.cookie);
	return resolveShare(data.url, cookie);
});
var resolvePackFn_createServerFn_handler = createServerRpc({
	id: "c3405a470d03952b376ac02526b748f2f076e86ef39ce41b530c90eb3202f311",
	name: "resolvePackFn",
	filename: "src/lib/extractors/resolve.functions.ts"
}, (opts) => resolvePackFn.__executeServer(opts));
var resolvePackFn = createServerFn({ method: "POST" }).validator((data) => {
	const d = data;
	if (!d || typeof d.url !== "string") throw new Error("url is required");
	return { url: d.url };
}).handler(resolvePackFn_createServerFn_handler, async ({ data }) => resolvePack(data.url));
//#endregion
export { resolveLink_createServerFn_handler, resolvePackFn_createServerFn_handler };
