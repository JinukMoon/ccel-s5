/* Shared helpers for all three pages. Every fact comes from window.CCEL (_shared/content.js). */
(function () {
  'use strict';
  const D = window.CCEL;
  const SH = '_shared/';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = html => String(html || '').replace(/<[^>]+>/g, '');
  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const asset = p => SH + p;
  // links in the data may be absolute https, legacy http (upgraded), or paths relative to _shared/
  const href = u => !u ? null : /^https:\/\//i.test(u) ? u : /^http:\/\//i.test(u) ? 'https://' + u.slice(7) : SH + u.replace(/^\.?\//, '');
  const fmt = n => n.toLocaleString('en-US');
  const pct = (a, b) => b ? (Math.round(1000 * a / b) / 10).toFixed(1) + '%' : '0%';

  const pubs = D.publications;
  const byNo = new Map(pubs.map(p => [p.no, p]));
  const published = pubs.filter(p => p.status === 'published');
  const areaByNum = new Map(D.research.areas.map(a => [a.numeral, a]));
  const STATUS_ORDER = ['published', 'accepted', 'in press', 'in revision', 'submitted'];
  const statusesPresent = () => {
    const seen = [...new Set(pubs.map(p => p.status))];
    return seen.sort((a, b) => (STATUS_ORDER.indexOf(a) + 99 * (STATUS_ORDER.indexOf(a) < 0)) - (STATUS_ORDER.indexOf(b) + 99 * (STATUS_ORDER.indexOf(b) < 0)));
  };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  /* ---- covers: attach only on DOI / URL match, never by index ---- */
  const normUrl = u => (u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/[#?].*$/, '').replace(/\/+$/, '');
  const coverOf = (() => {
    const byDoi = new Map(), byUrl = new Map();
    D.cover_publications.forEach(c => {
      if (c.doi) byDoi.set(c.doi.toLowerCase(), c);
      if (c.url) byUrl.set(normUrl(c.url), c);
    });
    const m = new Map();
    pubs.forEach(p => {
      const doi = p.doi && p.doi.toLowerCase();
      let c = doi && byDoi.get(doi);
      if (!c && p.url) c = byUrl.get(normUrl(p.url));
      if (!c && doi) c = D.cover_publications.find(x => x.url && x.url.toLowerCase().includes(doi));
      if (c) m.set(p.no, c);
    });
    return m;
  })();
  const pubOfCover = new Map([...coverOf].map(([no, c]) => [c, byNo.get(no)]));

  /* ---- citations ---- */
  const boldNames = (() => {
    const cache = new Map();
    return (html, names) => {
      const list = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length);
      if (!list.length) return html;
      const key = list.join('|');
      if (!cache.has(key)) cache.set(key, new RegExp('(^|[\\s,>])(' + list.map(escRe).join('|') + ')(?=$|[\\s,<])', 'g'));
      return html.replace(cache.get(key), (m, pre, name) => pre + '<strong>' + name + '</strong>');
    };
  })();
  const authorsHtml = p => boldNames(p.authors || '', [...(p.ccel_authors || []), D.professor.name]);
  // "Journal vol (year) pages." = citation_tail minus the leading author list and the trailing "(IF=...)"
  const sourceLine = p => {
    let r = p.citation_tail || '';
    const a = plain(p.authors);
    if (a && r.startsWith(a)) r = r.slice(a.length);
    return r.replace(/^\s*,\s*/, '').replace(/\s*\(IF\s*=[^)]*\).*$/, '').trim();
  };
  const ifHtml = p => p.impact_factor == null ? '' : p.if_provisional === true
    ? `<span class="prov" title="Provisional: the impact factor of the publication year is not released yet">IF ${esc(p.impact_factor)} (provisional)</span>`
    : `IF ${esc(p.impact_factor)}`;
  const pubLink = p => p.doi ? 'https://doi.org/' + p.doi : href(p.url);
  const areaTitle = n => (areaByNum.get(n) || {}).title || '';

  function citeHtml(p, opt = {}) {
    const link = pubLink(p);
    const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${p.title}</a>` : p.title;
    const src = [esc(sourceLine(p))];
    if (p.doi) src.push(`<a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>`);
    else if (link) src.push(`<a href="${esc(link)}" target="_blank" rel="noopener">Article</a>`);
    if (p.impact_factor != null) src.push(ifHtml(p));
    const tags = [];
    if (opt.area !== false && p.area) tags.push(`<span class="tag area-t" title="${esc(areaTitle(p.area))}">${opt.areaShort ? 'Area ' + esc(p.area) : `${esc(p.area)} · ${esc(areaTitle(p.area))}`}</span>`);
    if (p.status !== 'published') tags.push(`<span class="tag st">${esc(cap(p.status))}</span>`);
    if (p.highlight) tags.push(`<span class="tag hl">${esc(p.highlight)}</span>`);
    if (opt.coverTag && coverOf.has(p.no)) tags.push(`<a class="tag cv" href="publications.html#covers">Journal cover</a>`);
    if (opt.labLed && p.lab_led) tags.push(`<span class="tag">Lab-led</span>`);
    return `<p class="cite-title">${title}</p>
      <p class="cite-auth">${authorsHtml(p)}</p>
      <p class="cite-src">${src.join(' · ')}</p>
      ${tags.length ? `<p class="cite-tags">${tags.join('')}</p>` : ''}`;
  }
  function coverThumb(p, kinds = ['front']) {
    const c = coverOf.get(p.no);
    if (!c || !kinds.includes(c.kind)) return '';
    const link = href(c.url) || pubLink(p);
    return `<a class="cover-th" href="${esc(link)}" target="_blank" rel="noopener"><img src="${esc(asset(c.image))}" alt="Journal cover for: ${esc(plain(p.title))}" loading="lazy"></a>`;
  }

  /* ---- curated lists: curation.selected_pins (professor's order) and curation.recent_highlights (rule-filled) ---- */
  function pinsHtml(idPrefix = 'pin-') {
    const groups = [];
    D.curation.selected_pins.filter(x => byNo.has(x.no)).forEach(x => {
      let g = groups.find(g => g.area === x.area);
      if (!g) groups.push(g = { area: x.area, items: [] });
      g.items.push(byNo.get(x.no));
    });
    return groups.map(g => `<div class="pin-group">
      <h3>${g.area ? `<span class="numtag">${esc(g.area)}</span>${esc(areaTitle(g.area))}` : 'Other'}</h3>
      <ol class="cites">${g.items.map(p => `<li class="cite anchor" id="${idPrefix}${p.no}"><div>${citeHtml(p, { area: false })}</div>${coverThumb(p)}</li>`).join('')}</ol></div>`).join('');
  }
  function highlightsHtml() {
    return D.curation.recent_highlights.map(n => byNo.get(n)).filter(Boolean).map(p => {
      const th = coverThumb(p);
      return `<li class="hl-card"${th ? '' : ' style="grid-template-columns:1fr"'}>${th}<div>${citeHtml(p, { areaShort: true })}</div></li>`;
    }).join('');
  }

  /* ---- people link icons: only links that are set ---- */
  const ICON = {
    github: ['GitHub', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>'],
    linkedin: ['LinkedIn', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zm1.8 13.1H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>'],
    cv: ['CV', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 2.5h8.5l4.5 4.5v14.5H6z"/><path d="M14.5 2.5V7H19M9 12h7M9 15.5h7M9 19h4"/></svg>'],
    scholar: ['Google Scholar', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M5.2 13.8 0 9.5 12 0l12 9.5-5.2 4.3A7.5 7.5 0 0 0 12 9.5a7.5 7.5 0 0 0-6.8 4.3zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>'],
    homepage: ['Homepage', '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.7 3.8 5.9 3.8 9.5s-1.2 6.8-3.8 9.5c-2.6-2.7-3.8-5.9-3.8-9.5S9.4 5.2 12 2.5z"/></svg>']
  };
  function linkIcons(name, links) {
    const out = Object.keys(ICON).filter(k => links && links[k]).map(k => {
      const label = `${name} — ${ICON[k][0]}`;
      return `<a href="${esc(href(links[k]))}" target="_blank" rel="noopener" aria-label="${esc(label)}" title="${esc(label)}">${ICON[k][1]}</a>`;
    });
    return out.length ? `<span class="icons">${out.join('')}</span>` : '';
  }
  const profLinks = () => ({ scholar: D.professor.links.google_scholar, cv: D.professor.links.cv });

  /* ---- counts used across pages (computed, never typed in) ---- */
  const people = groups => groups.reduce((n, g) => n + g.people.length, 0);
  const stats = {
    published: published.length,
    pipeline: pubs.length - published.length,
    total: pubs.length,
    firstYear: Math.min(...published.map(p => p.year)),
    lastYear: Math.max(...published.map(p => p.year)),
    covers: D.cover_publications.length,
    areas: D.research.areas.length,
    members: people(D.members),
    alumni: people(D.alumni)
  };

  /* ---- header: compact on scroll, mobile menu ---- */
  function initHeader() {
    const root = document.documentElement;
    let last = null;
    const onScroll = () => { const c = window.scrollY > 8; if (c !== last) { root.classList.toggle('is-compact', c); last = c; } };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const btn = document.querySelector('.nav-toggle'), nav = document.getElementById('site-nav');
    if (btn && nav) {
      const set = open => { nav.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); };
      btn.addEventListener('click', () => set(!nav.classList.contains('open')));
      nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    }
  }
  function initFooter() {
    const el = document.getElementById('foot-data');
    if (!el) return;
    el.innerHTML = `${esc(D.lab.name)}<br>${esc(D.contact.address)}<br>
      Publication list curated ${esc(D.curation.updated_at)} · ${fmt(stats.total)} entries, ${fmt(stats.published)} published.`;
  }
  // after JS rendering changes the layout, land on the requested anchor again
  function settleHash() {
    if (!location.hash) return;
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) requestAnimationFrame(() => t.scrollIntoView({ block: 'start' }));
  }
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // charts draw in once when they enter the viewport
  function drawIn(els) {
    if (reduceMotion() || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.2 });
    els.forEach(e => io.observe(e));
  }

  window.S5 = { D, SH, esc, plain, asset, href, fmt, pct, cap, pubs, byNo, published, areaByNum, areaTitle, statusesPresent,
    coverOf, pubOfCover, authorsHtml, sourceLine, ifHtml, pubLink, citeHtml, coverThumb, pinsHtml, highlightsHtml, linkIcons, profLinks, stats,
    initHeader, initFooter, settleHash, reduceMotion, drawIn };
})();
