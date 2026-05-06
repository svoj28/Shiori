/**
 * animekai-scraper.ts
 *
 * Builds the JS string injected into the hidden WebView to scrape AnimeKai.
 * Extracted from player.tsx so it can be imported alongside animepahe.ts.
 *
 * Reverse-engineered from the open-source AniLink userscript (MIT license).
 */

export type AudioMode = "sub" | "dub";

export function buildScraperJS(
  title:     string,
  epNum:     number,
  audioMode: AudioMode,
): string {
  return `
(async function() {
  const RN = window.ReactNativeWebView;
  const post = (obj) => RN && RN.postMessage(JSON.stringify(obj));

  // ── Utility: AnimeKai token generation ──────────────────────────────────
  function generateToken(id) {
    try {
      if (typeof window.__ === 'function') return window.__(id);
      const scripts = Array.from(document.scripts).map(s => s.textContent);
      for (const src of scripts) {
        const m = src.match(/function __\\(([^)]+)\\)[^{]*\\{([^}]+)\\}/);
        if (m) {
          const fn = new Function(m[1], m[2]);
          return fn(id);
        }
      }
      return '';
    } catch(e) {
      return '';
    }
  }

  // ── Step 1: Search for the anime ──────────────────────────────────────────
  post({ type: 'stage', stage: 'searching' });
  let animeId = null;

  try {
    const searchResp = await fetch(
      '/ajax/search/suggest?keyword=' + encodeURIComponent(${JSON.stringify(title)}),
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    );
    const searchJson = await searchResp.json();
    const parser = new DOMParser();
    const doc = parser.parseFromString(searchJson.html || searchJson.result || '', 'text/html');
    const links = doc.querySelectorAll('a[href*="/watch/"], a[href*="/anime/"]');
    if (!links.length) throw new Error('No search results');

    const target = ${JSON.stringify(title.toLowerCase())};
    let best = links[0], bestScore = 0;
    for (const link of links) {
      const name = (link.querySelector('.film-name, .name, span')?.textContent ?? link.textContent).toLowerCase().trim();
      const words = target.split(' ').filter(w => name.includes(w)).length;
      const score = words / target.split(' ').length;
      if (score > bestScore) { bestScore = score; best = link; }
    }

    const href = best.getAttribute('href');
    animeId = href.replace(/^\\/(?:watch|anime)\\//, '').replace(/\\/$/, '');
    post({ type: 'stage', stage: 'episodes', match: best.textContent.trim().slice(0, 60) });
  } catch(e) {
    post({ type: 'error', message: 'Search failed: ' + e.message }); return;
  }

  // ── Step 2: Load the anime page and find the episode element ──────────────
  post({ type: 'stage', stage: 'episodes' });
  let episodeEid = null;

  try {
    const pageResp = await fetch('/watch/' + animeId, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const pageHtml = await pageResp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageHtml, 'text/html');

    const epEls = doc.querySelectorAll('a[num][eid], a[num][token], [data-num][data-eid]');
    let epEl = null;
    for (const el of epEls) {
      const num = el.getAttribute('num') || el.getAttribute('data-num');
      if (String(num) === String(${epNum})) { epEl = el; break; }
    }
    if (!epEl) {
      const allEpEls = doc.querySelectorAll('[num], [data-num]');
      for (const el of allEpEls) {
        const num = el.getAttribute('num') || el.getAttribute('data-num');
        if (String(num) === String(${epNum})) { epEl = el; break; }
      }
    }
    if (!epEl) throw new Error('Episode ${epNum} not found (found ' + epEls.length + ' episodes)');

    episodeEid = epEl.getAttribute('eid') || epEl.getAttribute('data-eid');
    if (!episodeEid) throw new Error('No eid on episode element');

    post({ type: 'stage', stage: 'servers' });
  } catch(e) {
    post({ type: 'error', message: 'Episode fetch failed: ' + e.message }); return;
  }

  // ── Step 3: Get server list ───────────────────────────────────────────────
  let serverId = null;

  try {
    const tok = generateToken(episodeEid);
    const url = '/ajax/links/list?eid=' + episodeEid + (tok ? '&_=' + tok : '') + '&type=${audioMode === 'dub' ? 2 : 1}';
    const resp = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const json = await resp.json();
    const html = json.result || json.html || '';
    const doc  = (new DOMParser()).parseFromString(html, 'text/html');

    const servers = doc.querySelectorAll('li[data-lid], li[data-id], li.server');
    if (!servers.length) throw new Error('No servers in response');

    let picked = servers[0];
    for (const s of servers) {
      const name = s.textContent.trim().toLowerCase();
      if (name.includes('default') || name.includes('vid')) { picked = s; break; }
    }
    serverId = picked.dataset.lid || picked.dataset.id || picked.getAttribute('data-lid') || picked.getAttribute('data-id');
    if (!serverId) throw new Error('Could not extract server ID');
  } catch(e) {
    post({ type: 'error', message: 'Server list failed: ' + e.message }); return;
  }

  // ── Step 4: Get stream URL ────────────────────────────────────────────────
  post({ type: 'stage', stage: 'stream' });

  try {
    const tok = generateToken(serverId);
    const url = '/ajax/links/view?id=' + serverId + (tok ? '&_=' + tok : '');
    const resp = await fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const json = await resp.json();

    const raw = json.result || json.url || json.src || '';
    if (!raw) throw new Error('Empty stream result');

    let streamUrl = raw;
    try {
      const decoded = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
      if (decoded.startsWith('http') || decoded.startsWith('/')) {
        streamUrl = decoded;
      } else {
        const obj = JSON.parse(decoded);
        streamUrl = obj.url || obj.src || obj.stream || obj.link || decoded;
      }
    } catch(_) {
      if (raw.startsWith('http')) streamUrl = raw;
    }

    if (streamUrl.startsWith('/')) streamUrl = 'https://anikai.to' + streamUrl;

    if (!streamUrl.startsWith('http')) {
      try {
        const obj = JSON.parse(raw);
        streamUrl = obj.url || obj.src || obj.stream || obj.link || obj.file || raw;
      } catch(_) {}
    }

    post({ type: 'done', url: streamUrl, referer: 'https://anikai.to/' });
  } catch(e) {
    post({ type: 'error', message: 'Stream fetch failed: ' + e.message });
  }
})();
true;
  `.trim();
}