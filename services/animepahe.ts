/**
 * animepahe.ts
 *
 * AnimePahe + Kwik stream extraction — designed to run inside a hidden WebView
 * (same pattern as the AnimeKai scraper in player.tsx).
 *
 * Flow:
 *  1. AnimePahe JSON API  →  search for anime  →  get anime session UUID
 *  2. AnimePahe JSON API  →  list episodes      →  find episode session hash
 *  3. AnimePahe JSON API  →  get Kwik embed URLs for that episode
 *  4. Fetch kwik.cx/e/<id> with Referer: animepahe  →  extract packed JS
 *  5. Unpack the obfuscated JS (p,a,c,k,e,d pattern)  →  find const source='...'
 *  6. Return { url: m3u8, referer: kwikEmbedUrl } to React Native via postMessage
 *
 * Why a WebView?
 *  AnimePahe uses DDoS-Guard / Cloudflare which blocks plain fetch() from RN.
 *  Loading animepahe.ru first plants the cookies + CF clearance, then all API
 *  calls succeed from the same browser context — exactly the same trick used
 *  for the AnimeKai scraper.
 *
 * Usage (in player.tsx):
 *  import { buildAnimePaheScraperJS } from '@/services/animepahe';
 *  ...
 *  webRef.current.injectJavaScript(buildAnimePaheScraperJS(title, epNum, audioMode) + '\ntrue;');
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimePaheAnime {
  id:      number
  title:   string
  session: string   // UUID, used in all subsequent API calls
  poster:  string
  type:    string
  year:    number
}

export interface AnimePaheEpisode {
  id:      number
  number:  number
  session: string   // 64-char hex hash, used to get sources
  snapshot: string
}

export interface AnimePaheSource {
  url:     string   // kwik.cx/e/<id>  embed URL
  quality: string   // "1080p" | "720p" | "360p"
  audio:   string   // "jpn" | "eng"
  fansub:  string
}

// ─── AnimePahe public API base ────────────────────────────────────────────────
// animepahe.ru is the most stable current domain (as of 2025).

const BASE = 'https://animepahe.ru'

// ─── REST helpers (for use outside WebView, e.g. episode list pre-fetch) ─────

export async function animepaheSearch(title: string): Promise<AnimePaheAnime[]> {
  const url = `${BASE}/api?m=search&q=${encodeURIComponent(title)}`
  const res  = await fetch(url, {
    headers: {
      'Referer':          BASE + '/',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  if (!res.ok) throw new Error(`animepaheSearch HTTP ${res.status}`)
  const json = await res.json()
  return (json.data ?? []).map((a: any) => ({
    id:      a.id,
    title:   a.title,
    session: a.session,
    poster:  a.poster,
    type:    a.type   ?? 'TV',
    year:    a.year   ?? 0,
  }))
}

export async function animepaheEpisodes(
  session: string,
  page    = 1,
): Promise<{ episodes: AnimePaheEpisode[]; lastPage: number }> {
  const url = `${BASE}/api?m=release&id=${session}&sort=episode_asc&page=${page}`
  const res  = await fetch(url, {
    headers: {
      'Referer':          `${BASE}/anime/${session}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  if (!res.ok) throw new Error(`animepaheEpisodes HTTP ${res.status}`)
  const json = await res.json()
  return {
    lastPage: json.last_page ?? 1,
    episodes: (json.data ?? []).map((e: any) => ({
      id:       e.id,
      number:   e.episode,
      session:  e.session,
      snapshot: e.snapshot ?? '',
    })),
  }
}

export async function animepaheLinks(
  animeSession:   string,
  episodeSession: string,
): Promise<AnimePaheSource[]> {
  const url = `${BASE}/api?m=links&id=${animeSession}&session=${episodeSession}&p=kwik`
  const res  = await fetch(url, {
    headers: {
      'Referer':          `${BASE}/play/${animeSession}/${episodeSession}`,
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  if (!res.ok) throw new Error(`animepaheLinks HTTP ${res.status}`)
  const json = await res.json()
  // Response shape: { data: [ {"720": {kwik: "https://kwik.cx/e/...", ...}}, ... ] }
  const sources: AnimePaheSource[] = []
  for (const entry of json.data ?? []) {
    for (const [quality, info] of Object.entries(entry as Record<string, any>)) {
      if (info?.kwik) {
        sources.push({
          url:     info.kwik,
          quality: quality,
          audio:   info.audio ?? 'jpn',
          fansub:  info.fansub ?? '',
        })
      }
    }
  }
  return sources
}

// ─── WebView scraper JS ───────────────────────────────────────────────────────
// This string is injected into a hidden WebView that has already loaded
// animepahe.ru (so Cloudflare cookies are set).

export type AnimePaheAudioMode = 'sub' | 'dub'

export function buildAnimePaheScraperJS(
  title:     string,
  epNum:     number,
  audioMode: AnimePaheAudioMode = 'sub',
): string {
  // Escape values for safe embedding into JS string literals
  const safeTitle = JSON.stringify(title)       // already quoted
  const safeEp    = JSON.stringify(epNum)
  const safeAudio = JSON.stringify(audioMode)

  return /* javascript */ `
(async function() {
  const RN   = window.ReactNativeWebView;
  const post = (obj) => RN && RN.postMessage(JSON.stringify(obj));
  const BASE = 'https://animepahe.ru';

  // ── Utility: p,a,c,k,e,d JS unpacker ─────────────────────────────────────
  // Kwik encodes its page with the classic Dean Edwards p,a,c,k,e,d packer.
  // This is the standard community unpacker, adapted to work without eval().
  function unpackJS(packed) {
    try {
      // Extract the p,a,c,k,e,d arguments from: eval(function(p,a,c,k,e,d){...}('...',N,N,'...'.split('|'),0,{}))
      const match = packed.match(
        /\\beval\\s*\\(\\s*function\\s*\\(\\s*p,\\s*a,\\s*c,\\s*k,\\s*e,\\s*[rd]\\s*\\)(.+?)\\('([^']+)',\\s*(\\d+),\\s*(\\d+),\\s*'([^']+)'\\s*\\.split/s
      );
      if (!match) return null;

      let [, , payload, radix, count, dictStr] = match;
      const r = parseInt(radix, 10);
      const dict = dictStr.split('|');

      // base-N decode helper
      const toBase = (n, r) => {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/';
        let result = '';
        do {
          result = chars[n % r] + result;
          n = Math.floor(n / r);
        } while (n > 0);
        return result;
      };

      const decoded = payload.replace(/\\b\\w+\\b/g, (word) => {
        const idx = parseInt(word, r);
        return (dict[idx] && dict[idx] !== '') ? dict[idx] : word;
      });

      return decoded;
    } catch(e) {
      return null;
    }
  }

  // ── Utility: extract m3u8 from decoded Kwik JS ────────────────────────────
  // After unpacking, the source looks like:  const source='https://...m3u8';
  // Sometimes it's:  var source="https://..."
  // Kwik may also have it as:  file:"https://...m3u8"
  function extractM3U8(js) {
    const patterns = [
      /const\\s+source\\s*=\\s*'([^']+\\.m3u8[^']*)'/, // const source='...'
      /const\\s+source\\s*=\\s*"([^"]+\\.m3u8[^"]*)"/, // const source="..."
      /var\\s+source\\s*=\\s*'([^']+\\.m3u8[^']*)'/, 
      /var\\s+source\\s*=\\s*"([^"]+\\.m3u8[^"]*)"/, 
      /file\\s*:\\s*'([^']+\\.m3u8[^']*)'/, 
      /file\\s*:\\s*"([^"]+\\.m3u8[^"]*)"/, 
      /src\\s*:\\s*'([^']+\\.m3u8[^']*)'/, 
      /'(https?:\\/\\/[^']+\\.m3u8[^']*)'/, // fallback: any quoted m3u8 URL
    ];
    for (const p of patterns) {
      const m = js.match(p);
      if (m) return m[1];
    }
    return null;
  }

  // ── Step 1: Search AnimePahe for the anime ────────────────────────────────
  post({ type: 'stage', stage: 'searching' });

  let animeSession = null;
  let matchedTitle = null;

  try {
    const searchRes = await fetch(
      BASE + '/api?m=search&q=' + encodeURIComponent(${safeTitle}),
      { headers: { 'Referer': BASE + '/', 'X-Requested-With': 'XMLHttpRequest' } }
    );
    if (!searchRes.ok) throw new Error('Search HTTP ' + searchRes.status);
    const searchJson = await searchRes.json();
    const results = searchJson.data ?? [];
    if (!results.length) throw new Error('No results for: ' + ${safeTitle});

    // Best-match by title similarity (same heuristic as AnimeKai scraper)
    const target = ${safeTitle}.toLowerCase();
    let best = results[0], bestScore = 0;
    for (const r of results) {
      const name  = (r.title ?? '').toLowerCase();
      const words = target.split(' ').filter(w => w.length > 2 && name.includes(w)).length;
      const score = words / Math.max(target.split(' ').length, 1);
      if (score > bestScore) { bestScore = score; best = r; }
    }

    animeSession = best.session;
    matchedTitle = best.title;
    post({ type: 'stage', stage: 'episodes', match: matchedTitle });
  } catch(e) {
    post({ type: 'error', message: 'Search failed: ' + e.message }); return;
  }

  // ── Step 2: Find the episode session hash ─────────────────────────────────
  // AnimePahe paginates episodes — we may need to walk multiple pages.
  post({ type: 'stage', stage: 'episodes' });

  let episodeSession = null;

  try {
    // Try pages 1..10 (most anime fit within 1-2 pages of 30 episodes each)
    const TARGET_EP = ${safeEp};
    let found = false;
    for (let page = 1; page <= 20 && !found; page++) {
      const epRes = await fetch(
        BASE + '/api?m=release&id=' + animeSession + '&sort=episode_asc&page=' + page,
        { headers: { 'Referer': BASE + '/anime/' + animeSession, 'X-Requested-With': 'XMLHttpRequest' } }
      );
      if (!epRes.ok) throw new Error('Episodes HTTP ' + epRes.status);
      const epJson = await epRes.json();
      const eps    = epJson.data ?? [];

      for (const ep of eps) {
        if (Math.round(ep.episode) === TARGET_EP) {
          episodeSession = ep.session;
          found = true;
          break;
        }
      }

      // If this page's episodes are already past our target, stop early
      if (eps.length > 0 && eps[eps.length - 1].episode > TARGET_EP + 5) break;
      // If we've reached the last page
      if (page >= (epJson.last_page ?? 1)) break;
    }

    if (!episodeSession) throw new Error('Episode ' + TARGET_EP + ' not found on AnimePahe');
    post({ type: 'stage', stage: 'servers' });
  } catch(e) {
    post({ type: 'error', message: 'Episode lookup failed: ' + e.message }); return;
  }

  // ── Step 3: Get Kwik embed URLs for this episode ──────────────────────────
  let kwikUrl = null;

  try {
    const linksRes = await fetch(
      BASE + '/api?m=links&id=' + animeSession + '&session=' + episodeSession + '&p=kwik',
      {
        headers: {
          'Referer':          BASE + '/play/' + animeSession + '/' + episodeSession,
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    );
    if (!linksRes.ok) throw new Error('Links HTTP ' + linksRes.status);
    const linksJson = await linksRes.json();

    // Response: { data: [ {"1080": {kwik:"...", audio:"jpn", ...}}, {"720": {...}}, ... ] }
    const audioTarget = ${safeAudio} === 'dub' ? 'eng' : 'jpn';

    // Build flat list: [{quality, url, audio}]
    const sources = [];
    for (const entry of linksJson.data ?? []) {
      for (const [quality, info] of Object.entries(entry)) {
        if (info && info.kwik) {
          sources.push({ quality, url: info.kwik, audio: info.audio ?? 'jpn' });
        }
      }
    }

    if (!sources.length) throw new Error('No Kwik sources in response');

    // Prefer preferred audio, then fall back to any
    const preferred = sources.filter(s => s.audio === audioTarget);
    const pool      = preferred.length ? preferred : sources;

    // Pick best quality: 1080 > 720 > 480 > 360
    pool.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
    kwikUrl = pool[0].url;
    post({ type: 'stage', stage: 'stream', kwikUrl });
  } catch(e) {
    post({ type: 'error', message: 'Links fetch failed: ' + e.message }); return;
  }

  // ── Step 4: Extract m3u8 from Kwik embed page ─────────────────────────────
  // Kwik serves a page with a p,a,c,k,e,d obfuscated script containing the stream.
  // We must send Referer: animepahe.ru or Kwik returns 403.

  try {
    const kwikRes = await fetch(kwikUrl, {
      headers: {
        'Referer':    BASE + '/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });
    if (!kwikRes.ok) throw new Error('Kwik HTTP ' + kwikRes.status);
    const html = await kwikRes.text();

    // Extract all eval(function(p,a,c,k,e,d){...}) blocks
    const evalBlocks = html.match(/eval\\(function\\(p,a,c,k,e,[dr]\\)\\{[\\s\\S]+?\\}\\('[\\s\\S]+?'\\s*\\.split\\('\\|'\\)\\s*,\\s*\\d+\\s*,\\s*\\{\\}\\)\\)/g) ?? [];

    let m3u8 = null;

    for (const block of evalBlocks) {
      const unpacked = unpackJS(block);
      if (unpacked) {
        m3u8 = extractM3U8(unpacked);
        if (m3u8) break;
      }
    }

    // Fallback: try to find m3u8 directly in raw HTML (sometimes Kwik doesn't pack)
    if (!m3u8) {
      m3u8 = extractM3U8(html);
    }

    if (!m3u8) throw new Error('Could not extract m3u8 from Kwik page (HTML length: ' + html.length + ')');

    // The m3u8 MUST be played with the Kwik embed URL as the Referer,
    // otherwise the CDN returns 403.
    post({ type: 'done', url: m3u8, referer: kwikUrl });
  } catch(e) {
    post({ type: 'error', message: 'Kwik extraction failed: ' + e.message });
  }
})();
true;
  `.trim()
}