import { t as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-A6pJPYTF.mjs";
import { a as setSessionCookie, i as sessionInfo, t as clearSession } from "./session-H4L6vJGS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login.functions-Cw61hZHX.js
var LOGIN_URL = "https://www.terabox.com/login";
/**
* Log into TeraBox with email+password in a real Chromium session and harvest
* ndus. Passwords are never written to disk. Slide-captcha cannot be solved
* reliably here — if TeraBox shows one, we stop and ask for a pasted ndus.
*/
async function loginTerabox(email, password) {
	const user = email.trim();
	const pass = password.trim();
	if (!user || !user.includes("@") || pass.length < 4) return {
		ok: false,
		error: "Need a real TeraBox email and password."
	};
	try {
		const { chromium } = await import("playwright");
		const browser = await chromium.launch({
			headless: true,
			args: ["--no-sandbox", "--disable-dev-shm-usage"]
		});
		try {
			const page = await browser.newPage({
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
				viewport: {
					width: 1280,
					height: 800
				}
			});
			await page.goto(LOGIN_URL, {
				waitUntil: "domcontentloaded",
				timeout: 3e4
			});
			await page.waitForTimeout(1200);
			const emailBox = page.locator("input[placeholder*=\"email\" i], input[type=\"text\"]").first();
			const passBox = page.locator("input[type=\"password\"]").first();
			await emailBox.waitFor({
				state: "visible",
				timeout: 12e3
			});
			await emailBox.fill(user);
			await passBox.fill(pass);
			await page.getByRole("button", { name: /log in/i }).click();
			const deadline = Date.now() + 28e3;
			while (Date.now() < deadline) {
				const cookies = await page.context().cookies();
				const ndus = cookies.find((c) => c.name === "ndus" && c.value && c.value !== "0");
				const body = await page.locator("body").innerText().catch(() => "");
				const html = await page.content().catch(() => "");
				if (ndus) {
					const header = cookies.filter((c) => /terabox|1024tera|dubox|nephobox/i.test(c.domain)).map((c) => `${c.name}=${c.value}`).join("; ");
					setSessionCookie(header, user);
					const info = sessionInfo();
					return {
						ok: true,
						ndusTail: info.ndusTail,
						emailMasked: info.emailMasked,
						cookie: `ndus=${ndus.value}`
					};
				}
				if (/slide to verify|drag the slider|simple-verify|unusual activity|captcha/i.test(`${body}\n${html}`)) return {
					ok: false,
					error: "TeraBox showed a captcha on this login.",
					hint: "I cannot reliably solve their slide puzzle from here. Log in once in your own browser, copy the ndus cookie (DevTools → Application → Cookies), and paste it in Settings. Or send me that ndus value."
				};
				if (/incorrect|wrong password|account does not exist|invalid email/i.test(body)) return {
					ok: false,
					error: "TeraBox rejected that email or password."
				};
				await page.waitForTimeout(800);
			}
			return {
				ok: false,
				error: "Login did not produce an ndus cookie in time.",
				hint: "TeraBox may be asking for extra verification. Paste ndus from a browser that is already logged in."
			};
		} finally {
			await browser.close();
		}
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err),
			hint: "Headless login failed. You can still paste an ndus cookie in Settings — listing and original playback also work without it via the public worker."
		};
	}
}
function logoutTerabox() {
	clearSession();
}
function currentSession() {
	return sessionInfo();
}
var loginTeraboxFn_createServerFn_handler = createServerRpc({
	id: "fa2b083eb6a18e09bfab3d516966e429dc1a0607251a3d58a6aa1d71efb1440b",
	name: "loginTeraboxFn",
	filename: "src/lib/extractors/login.functions.ts"
}, (opts) => loginTeraboxFn.__executeServer(opts));
var loginTeraboxFn = createServerFn({ method: "POST" }).validator((data) => {
	const d = data;
	if (!d || typeof d.email !== "string" || typeof d.password !== "string") throw new Error("email and password are required");
	return {
		email: d.email,
		password: d.password
	};
}).handler(loginTeraboxFn_createServerFn_handler, async ({ data }) => loginTerabox(data.email, data.password));
var sessionStatusFn_createServerFn_handler = createServerRpc({
	id: "a3bed3e8921afa9af61596f203ef96f21414e7bee5b6ba2d2e1d721dcefcad13",
	name: "sessionStatusFn",
	filename: "src/lib/extractors/login.functions.ts"
}, (opts) => sessionStatusFn.__executeServer(opts));
var sessionStatusFn = createServerFn({ method: "POST" }).validator(() => ({})).handler(sessionStatusFn_createServerFn_handler, async () => currentSession());
var logoutTeraboxFn_createServerFn_handler = createServerRpc({
	id: "b334cfa2265f8fec1b9ebbce53b186d3094d596c67cf3ff73138a9f044e37051",
	name: "logoutTeraboxFn",
	filename: "src/lib/extractors/login.functions.ts"
}, (opts) => logoutTeraboxFn.__executeServer(opts));
var logoutTeraboxFn = createServerFn({ method: "POST" }).validator(() => ({})).handler(logoutTeraboxFn_createServerFn_handler, async () => {
	logoutTerabox();
	return { ok: true };
});
//#endregion
export { loginTeraboxFn_createServerFn_handler, logoutTeraboxFn_createServerFn_handler, sessionStatusFn_createServerFn_handler };
