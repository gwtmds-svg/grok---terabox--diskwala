import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/guide")({ component: Guide });

function Guide() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteHeader active="guide" />
      <article className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pb-24 text-base leading-relaxed text-muted">
        <h1 className="font-display text-4xl tracking-tight text-fg">How Skipper works</h1>
        <p>
          Skipper is a share-link resolver. You paste a public TeraBox, Diskwala or Blatim URL. The
          server talks to the host’s own APIs, skips the ad wall, and returns the file list
          plus play/download handles. Nothing is stored on an account — history lives in this
          browser.
        </p>
        <h2 className="font-display text-2xl text-fg">Any site</h2>
        <p>
          The Any site page takes a normal website link or a direct file (.mp4, .webm, .m3u8). It
          lists every public video that page publishes — including a player frame on the page —
          then plays or downloads them through Skipper. Several files save as one zip. It does not
          log into accounts, and it does not open videos locked inside YouTube, Netflix, TikTok, or
          similar apps. Counts (site name, success, speed, phone or desktop) are stored on this
          server until you host and connect a database. The link itself is never stored.
        </p>

        <h2 className="font-display text-2xl text-fg">Do I need to log in?</h2>
        <p>
          No, not for listing files or watching the in-browser stream. TeraBox still publishes
          share metadata, but <code className="font-mono text-fg">/share/list</code> now often
          answers <code className="font-mono text-fg">errno 400141 need verify</code> without a
          fresh session. Skipper races the share page on 1024tera / terabox.app / terabox.com,
          then prefers <code className="font-mono text-fg">/api/shorturlinfo</code> (sign,
          timestamp, uk, shareid, file list) and only falls back to{" "}
          <code className="font-mono">/share/list</code> with jsToken + pcftoken.
        </p>
        <p>
          Original-quality download of the exact uploaded file is the one step that TeraBox
          gates. Their <code className="font-mono text-fg">/api/sharedownload</code> endpoint
          returns <code className="font-mono">errno -6 need verify_v2</code> without a live{" "}
          <code className="font-mono text-fg">ndus</code> cookie from a logged-in account.
          That cookie is optional and pasted in Settings. You do not need a pool of 10
          accounts for the app to function — a pool is only a reliability tactic if you serve
          original downloads at scale.
        </p>

        <h2 className="font-display text-2xl text-fg">TeraBox, step by step</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Parse the share code (surl). 1024tera /s/1XXXX, teraboxshare.com/s/…,
            teraboxlinke.com/v/…, teraboxlink.com/s/… and twenty-plus mirrors all share the same
            code. A leading 1 is tried both with and without — Skipper never guesses only one
            form.
          </li>
          <li>
            GET the share HTML on several origins, collect Set-Cookie, extract jsToken from the
            percent-encoded <code className="font-mono text-fg">fn("…")</code> script and
            pcftoken from <code className="font-mono">templateData</code>.
          </li>
          <li>
            GET /api/shorturlinfo (try with and without the leading 1) — errno 0 returns
            filename, size, thumbs, fs_id, shareid, uk, plus the official streaming sign +
            timestamp. Fall back to /share/list?jsToken=&pcftoken= if that endpoint is quiet.
          </li>
          <li>
            For video, GET /share/streaming with the official sign when we have it, otherwise
            sha1(uk + shareid + fid + unixTime). Confirmed live without login. HLS is rewritten
            through /api/hls and /api/seg so the player is not blocked by CDN CORS. Quality
            ladder now includes 720 as well as 480/360.
          </li>
          <li>
            If an ndus cookie is present, POST /api/sharedownload and /share/download for the
            original dlink and follow the CDN redirect.
          </li>
        </ol>

        <h2 className="font-display text-2xl text-fg">Diskwala</h2>
        <p>
          Diskwala's own website is not a player. <code className="font-mono text-fg">/app/:id</code>{" "}
          is a React “download the app” landing that often paints{" "}
          <em>Page Not Found</em> even when the file is live — AppiCrypt-signed{" "}
          <code className="font-mono text-fg">temp_info</code>,{" "}
          <code className="font-mono">playlist_info</code> and{" "}
          <code className="font-mono">creator_info</code> calls 400/403 without Talsec WASM, and
          the route was never a streamer. Other skip-sites work because they never scrape that
          page.
        </p>
        <p>
          Skipper uses the same public worker as TeraBox:{" "}
          <code className="font-mono text-fg">POST /api/proxy</code> with the Diskwala URL,
          racing www and apex in parallel. That returns the original MP4 on{" "}
          <code className="font-mono text-fg">cdns*.diskwala.com</code> or S3 (Range 206,{" "}
          <code className="font-mono">ftypisom</code>). Open also tries{" "}
          <code className="font-mono">/playlist/:id</code> because 2026 albums live there. Play
          and Download go through Skipper's same-origin{" "}
          <code className="font-mono text-fg">/api/file</code> proxy so the browser actually
          plays the file. No Diskwala login, no AppiCrypt, no ndus.
        </p>

        <h2 className="font-display text-2xl text-fg">Blatim</h2>
        <p>
          Blatim's <code className="font-mono text-fg">/watch/:slug</code> page never plays the
          file in a browser — it is a Broadcaster / BSplit install wall. Skipper never visits
          that page. It reads the public{" "}
          <code className="font-mono text-fg">/api/video/:slug/info</code> JSON (no login) and
          follows <code className="font-mono">sourceUrl</code>. External uploads resolve to
          VidBunker CDNs (<code className="font-mono">videos.vidbunker.in</code>, Range 206,
          original MP4) or unwrap a nested TeraBox / Diskwala share, including whole folders.
          Local Blatim uploads sit behind a Firebase App Check signed stream; those still list,
          but original Play needs the published CDN.
        </p>

        <h2 className="font-display text-2xl text-fg">Folder Pack</h2>
        <p>
          The second paste bar collects the public share, not the uploader’s private account.
          TeraBox follows the worker’s own folder pages (<code className="font-mono">dir</code> and{" "}
          <code className="font-mono">page</code>, capped so the page stays responsive). Diskwala
          tries <code className="font-mono">/app</code>, <code className="font-mono">/playlist</code> and{" "}
          <code className="font-mono">/creator</code> one at a time, and only keeps clips that share
          the same storage prefix. Blatim includes a nested TeraBox or Diskwala folder when the
          watch file wraps one. One click zips every original file. Other shares on the same
          account are not public — TeraBox, Diskwala and Blatim do not hand those out from one link.
        </p>

        <h2 className="font-display text-2xl text-fg">Host check</h2>
        <p>
          Skipper quietly re-reads the public pages these hosts ship (the worker path, whether
          Diskwala still signs its API, whether Blatim still publishes watch info) and prefers
          whichever path last answered. That check never blocks Open. The Live / Down marks under
          the title are that check. A private account is still never listed.
        </p>

        <h2 className="font-display text-2xl text-fg">Telegram pastes</h2>
        <p>
          You can paste a whole Telegram message, a <code className="font-mono text-fg">t.me/s/…</code>{" "}
          public preview, or a <code className="font-mono">t.me/channel/123</code> post. Skipper
          pulls out every TeraBox, Diskwala and Blatim URL in it (and a bare 24-character Diskwala
          id) and opens the first one. Folder Pack collects every nested share from that post.
          Private invite links (<code className="font-mono">t.me/+…</code>) cannot be unwrapped.
        </p>
        <p>
          The first paste is the one that should work. Skipper reads the input on paste, strips
          extra caption text, and returns as soon as the public original-file worker answers —
          it no longer waits on TeraBox’s slow native listing.
        </p>

        <h2 className="font-display text-2xl text-fg">What is finished vs next</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>TeraBox listing — done, no login, typically under 2 seconds.</li>
          <li>TeraBox original Play + Download via public worker — done, no login. First Open is enough.</li>
          <li>TeraBox mirrors including teraboxshare.com /s/ and teraboxlinke.com /v/ — done.</li>
          <li>Telegram post unwrap (public t.me/s and messy captions) — done.</li>
          <li>Optional ndus original download — wired, needs your cookie if the worker is down.</li>
          <li>Diskwala original Play + Download via the same public worker — done, no login.</li>
          <li>Blatim watch unwrap (VidBunker / TeraBox / Diskwala originals, no app, no ads) — done.</li>
          <li>Folder Pack zip for TeraBox, Diskwala and Blatim — done. Walks the public share only.</li>
          <li>Background host check (worker path, Diskwala signing, Blatim watch info) — done. It does not block Open.</li>
          <li>Password-protected TeraBox shares — documented, not built. A stranger’s whole account is not public.</li>
        </ul>

        <p>
          The full engineering brief for the next builder lives in{" "}
          <a href="/docs/AI_HANDOFF_PROMPT.md" className="text-fg underline">
            docs/AI_HANDOFF_PROMPT.md
          </a>{" "}
          and the A–Z runbook in{" "}
          <a href="/docs/COMPLETE_BUILD_GUIDE.md" className="text-fg underline">
            docs/COMPLETE_BUILD_GUIDE.md
          </a>
          . A source archive is at{" "}
          <a href="/skipper-source.zip" className="text-fg underline">
            skipper-source.zip
          </a>
          .
        </p>
      </article>
    </div>
  );
}
