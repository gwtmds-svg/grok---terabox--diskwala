import { x as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SiteHeader } from "./site-header-CsBGfoev.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/guide-D1pvaPGW.js
var import_jsx_runtime = require_jsx_runtime();
function Guide() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { active: "guide" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
			className: "mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 text-base leading-relaxed text-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl tracking-tight text-fg",
					children: "How Skipper works"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Skipper is a share-link resolver. You paste a public TeraBox, Diskwala or Blatim URL. The server talks to the host’s own APIs, skips the ad wall, and returns the file list plus play/download handles. Nothing is stored on an account — history lives in this browser." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Any video"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The Any video page takes a normal website link or a direct file (.mp4, .webm, .m3u8). It lists every public video that page publishes, then plays or downloads them through Skipper. It does not log into accounts, and it does not open videos locked inside YouTube, Netflix, or similar apps. Counts (site name, success, speed) are stored on the server — not the link itself — and move to your database when you host." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Do I need to log in?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"No, not for listing files or watching the in-browser stream. TeraBox still publishes share metadata, but ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/share/list"
					}),
					" now often answers ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "errno 400141 need verify"
					}),
					" without a fresh session. Skipper races the share page on 1024tera / terabox.app / terabox.com, then prefers ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/api/shorturlinfo"
					}),
					" (sign, timestamp, uk, shareid, file list) and only falls back to",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "/share/list"
					}),
					" with jsToken + pcftoken."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Original-quality download of the exact uploaded file is the one step that TeraBox gates. Their ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/api/sharedownload"
					}),
					" endpoint returns ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "errno -6 need verify_v2"
					}),
					" without a live",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "ndus"
					}),
					" cookie from a logged-in account. That cookie is optional and pasted in Settings. You do not need a pool of 10 accounts for the app to function — a pool is only a reliability tactic if you serve original downloads at scale."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "TeraBox, step by step"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
					className: "list-decimal space-y-2 pl-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Parse the share code (surl). 1024tera /s/1XXXX, teraboxshare.com/s/…, teraboxlinke.com/v/…, teraboxlink.com/s/… and twenty-plus mirrors all share the same code. A leading 1 is tried both with and without — Skipper never guesses only one form." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							"GET the share HTML on several origins, collect Set-Cookie, extract jsToken from the percent-encoded ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "font-mono text-fg",
								children: "fn(\"…\")"
							}),
							" script and pcftoken from ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
								className: "font-mono",
								children: "templateData"
							}),
							"."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "GET /api/shorturlinfo (try with and without the leading 1) — errno 0 returns filename, size, thumbs, fs_id, shareid, uk, plus the official streaming sign + timestamp. Fall back to /share/list?jsToken=&pcftoken= if that endpoint is quiet." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "For video, GET /share/streaming with the official sign when we have it, otherwise sha1(uk + shareid + fid + unixTime). Confirmed live without login. HLS is rewritten through /api/hls and /api/seg so the player is not blocked by CDN CORS. Quality ladder now includes 720 as well as 480/360." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "If an ndus cookie is present, POST /api/sharedownload and /share/download for the original dlink and follow the CDN redirect." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Diskwala"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Diskwala's own website is not a player. ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/app/:id"
					}),
					" ",
					"is a React “download the app” landing that often paints",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "Page Not Found" }),
					" even when the file is live — AppiCrypt-signed",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "temp_info"
					}),
					",",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "playlist_info"
					}),
					" and",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "creator_info"
					}),
					" calls 400/403 without Talsec WASM, and the route was never a streamer. Other skip-sites work because they never scrape that page."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Skipper uses the same public worker as TeraBox:",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "POST /api/proxy"
					}),
					" with the Diskwala URL, racing www and apex in parallel. That returns the original MP4 on",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "cdns*.diskwala.com"
					}),
					" or S3 (Range 206,",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "ftypisom"
					}),
					"). Open also tries",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "/playlist/:id"
					}),
					" because 2026 albums live there. Play and Download go through Skipper's same-origin",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/api/file"
					}),
					" proxy so the browser actually plays the file. No Diskwala login, no AppiCrypt, no ndus."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Blatim"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Blatim's ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/watch/:slug"
					}),
					" page never plays the file in a browser — it is a Broadcaster / BSplit install wall. Skipper never visits that page. It reads the public",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "/api/video/:slug/info"
					}),
					" JSON (no login) and follows ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "sourceUrl"
					}),
					". External uploads resolve to VidBunker CDNs (",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "videos.vidbunker.in"
					}),
					", Range 206, original MP4) or unwrap a nested TeraBox / Diskwala share, including whole folders. Local Blatim uploads sit behind a Firebase App Check signed stream; those still list, but original Play needs the published CDN."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Folder Pack"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"The second paste bar collects the public share, not the uploader’s private account. TeraBox follows the worker’s own folder pages (",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "dir"
					}),
					" and",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "page"
					}),
					", capped so the page stays responsive). Diskwala tries ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "/app"
					}),
					", ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "/playlist"
					}),
					" and",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "/creator"
					}),
					" one at a time, and only keeps clips that share the same storage prefix. Blatim includes a nested TeraBox or Diskwala folder when the watch file wraps one. One click zips every original file. Other shares on the same account are not public — TeraBox, Diskwala and Blatim do not hand those out from one link."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Host check"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Skipper quietly re-reads the public pages these hosts ship (the worker path, whether Diskwala still signs its API, whether Blatim still publishes watch info) and prefers whichever path last answered. That check never blocks Open. The Live / Down marks under the title are that check. A private account is still never listed." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "Telegram pastes"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"You can paste a whole Telegram message, a ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono text-fg",
						children: "t.me/s/…"
					}),
					" ",
					"public preview, or a ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "t.me/channel/123"
					}),
					" post. Skipper pulls out every TeraBox, Diskwala and Blatim URL in it (and a bare 24-character Diskwala id) and opens the first one. Folder Pack collects every nested share from that post. Private invite links (",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
						className: "font-mono",
						children: "t.me/+…"
					}),
					") cannot be unwrapped."
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "The first paste is the one that should work. Skipper reads the input on paste, strips extra caption text, and returns as soon as the public original-file worker answers — it no longer waits on TeraBox’s slow native listing." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl text-fg",
					children: "What is finished vs next"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
					className: "list-disc space-y-2 pl-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "TeraBox listing — done, no login, typically under 2 seconds." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "TeraBox original Play + Download via public worker — done, no login. First Open is enough." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "TeraBox mirrors including teraboxshare.com /s/ and teraboxlinke.com /v/ — done." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Telegram post unwrap (public t.me/s and messy captions) — done." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Optional ndus original download — wired, needs your cookie if the worker is down." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Diskwala original Play + Download via the same public worker — done, no login." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Blatim watch unwrap (VidBunker / TeraBox / Diskwala originals, no app, no ads) — done." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Folder Pack zip for TeraBox, Diskwala and Blatim — done. Walks the public share only." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Background host check (worker path, Diskwala signing, Blatim watch info) — done. It does not block Open." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Password-protected TeraBox shares — documented, not built. A stranger’s whole account is not public." })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"The full engineering brief for the next builder lives in",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/docs/AI_HANDOFF_PROMPT.md",
						className: "text-fg underline",
						children: "docs/AI_HANDOFF_PROMPT.md"
					}),
					" ",
					"and the A–Z runbook in",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/docs/COMPLETE_BUILD_GUIDE.md",
						className: "text-fg underline",
						children: "docs/COMPLETE_BUILD_GUIDE.md"
					}),
					". A source archive is at",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/skipper-source.zip",
						className: "text-fg underline",
						children: "skipper-source.zip"
					}),
					"."
				] })
			]
		})]
	});
}
//#endregion
export { Guide as component };
