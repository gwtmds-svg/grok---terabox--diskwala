import { clearSession, sessionInfo, setSessionCookie } from "./session";

const LOGIN_URL = "https://www.terabox.com/login";

export type LoginResult =
  | { ok: true; ndusTail: string; emailMasked: string; cookie: string }
  | { ok: false; error: string; hint?: string };

/**
 * Log into TeraBox with email+password in a real Chromium session and harvest
 * ndus. Passwords are never written to disk. Slide-captcha cannot be solved
 * reliably here — if TeraBox shows one, we stop and ask for a pasted ndus.
 */
export async function loginTerabox(email: string, password: string): Promise<LoginResult> {
  const user = email.trim();
  const pass = password.trim();
  if (!user || !user.includes("@") || pass.length < 4) {
    return { ok: false, error: "Need a real TeraBox email and password." };
  }

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
      });
      await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1200);

      const emailBox = page.locator('input[placeholder*="email" i], input[type="text"]').first();
      const passBox = page.locator('input[type="password"]').first();
      await emailBox.waitFor({ state: "visible", timeout: 12000 });
      await emailBox.fill(user);
      await passBox.fill(pass);
      await page.getByRole("button", { name: /log in/i }).click();

      // Either we land in the drive, we get ndus, or a captcha/error appears.
      const deadline = Date.now() + 28000;
      while (Date.now() < deadline) {
        const cookies = await page.context().cookies();
        const ndus = cookies.find((c) => c.name === "ndus" && c.value && c.value !== "0");
        const body = await page.locator("body").innerText().catch(() => "");
        const html = await page.content().catch(() => "");
        if (ndus) {
          const header = cookies
            .filter((c) => /terabox|1024tera|dubox|nephobox/i.test(c.domain))
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");
          setSessionCookie(header, user);
          const info = sessionInfo();
          return {
            ok: true,
            ndusTail: info.ndusTail,
            emailMasked: info.emailMasked,
            cookie: `ndus=${ndus.value}`,
          };
        }
        if (
          /slide to verify|drag the slider|simple-verify|unusual activity|captcha/i.test(
            `${body}\n${html}`,
          )
        ) {
          return {
            ok: false,
            error: "TeraBox showed a captcha on this login.",
            hint: "I cannot reliably solve their slide puzzle from here. Log in once in your own browser, copy the ndus cookie (DevTools → Application → Cookies), and paste it in Settings. Or send me that ndus value.",
          };
        }
        if (/incorrect|wrong password|account does not exist|invalid email/i.test(body)) {
          return { ok: false, error: "TeraBox rejected that email or password." };
        }
        await page.waitForTimeout(800);
      }
      return {
        ok: false,
        error: "Login did not produce an ndus cookie in time.",
        hint: "TeraBox may be asking for extra verification. Paste ndus from a browser that is already logged in.",
      };
    } finally {
      await browser.close();
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      hint: "Headless login failed. You can still paste an ndus cookie in Settings — listing and original playback also work without it via the public worker.",
    };
  }
}

export function logoutTerabox(): void {
  clearSession();
}

export function currentSession() {
  return sessionInfo();
}
