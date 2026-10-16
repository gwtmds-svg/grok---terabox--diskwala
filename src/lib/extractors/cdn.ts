export const MEDIA_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const ALLOW = [
  "freeterabox.com",
  "terabox.com",
  "terabox.app",
  "terabox.fun",
  "teraboxcdn.com",
  "teraboxpage.com",
  "teraboxdl.site",
  "dl-worker.teraboxdl.site",
  "1024tera.com",
  "1024tera.co",
  "1024terabox.com",
  "1024box.com",
  "4funbox.com",
  "4funbox.co",
  "nephobox.com",
  "mirrobox.com",
  "momerybox.com",
  "tibibox.com",
  "teraboxapp.com",
  "teraboxshare.com",
  "teraboxlink.com",
  "teraboxlinke.com",
  "terasharelink.com",
  "terafileshare.com",
  "terasharefile.com",
  "teraboxurl.com",
  "dubox.com",
  "diskwala.com",
  "diskwala.app",
  "diskwala.net",
  "diskwala-fast-edge.net",
  "revwala.com",
  "dw2in.com",
  "litedns.xyz",
  "blatim.com",
  "vidbunker.in",
  "vidbunker.com",
  "vidbunker.net",
  "supabase.co",
  "amazonaws.com",
  "cloudfront.net",
  "baidupcs.com",
  "workers.dev",
  "r2.dev",
  "googleapis.com",
  "googleusercontent.com",
  "digitaloceanspaces.com",
  "wasabisys.com",
  "backblazeb2.com",
  "b-cdn.net",
  "cdninstagram.com",
  "fbcdn.net",
  "storage.googleapis.com",
];

export function isAllowedCdn(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return ALLOW.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
