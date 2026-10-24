/* Publications page: all entries newest first, grouped by year (publication_counts), client-side search and filters,
   plus Selected (curation) and Journal covers views. Rendered once; filtering only toggles `hidden`. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, fmt, pubs, plain, cap, pubOfCover, citeHtml, asset, href, pubLink } = S;
  const $ = id => document.getElementById(id);

  /* ---------- summary ---------- */
  const statuses = S.statusesPresent();
  const yearsAll = [...new Set(Object.keys(D.publication_counts).map(Number).concat(pubs.map(p => p.year)))].sort((a, b) => b - a);
  $('pub-sub').textContent = 'Newest first, grouped by year. CCEL members are shown in bold; within each year, papers not yet published follow the published ones.';

  /* ---------- year strip: published papers per year, small; each bar is a link that jumps to that year ---------- */
  const pubPerYear = new Map();
  pubs.forEach(p => { if (p.status === 'published') pubPerYear.set(p.year, (pubPerYear.get(p.year) || 0) + 1); });
  const stripYears = yearsAll.slice().reverse();
  const ymax = Math.max(...stripYears.map(y => pubPerYear.get(y) || 0));
  $('ystrip').innerHTML = stripYears.map(y => { const n = pubPerYear.get(y) || 0;
    return `<a href="#y${y}" data-y="${y}" aria-label="${y}: ${n} published papers. Jump to ${y}">
      <span class="v" aria-hidden="true">${n}</span><span class="b" style="height:${(64 * n / ymax).toFixed(1)}px"></span><span class="y" aria-hidden="true"><span class="yl">${y}</span><span class="ys">’${String(y).slice(2)}</span></span></a>`; }).join('');

  $('ystrip').scrollLeft = $('ystrip').scrollWidth;   // narrow screens: open on the newest years

  /* ---------- list ---------- */
  const items = [];   // {p, el, hay}
  const groupHtml = y => {
    const all = pubs.filter(p => p.year === y), pub = all.filter(p => p.status === 'published'), rest = all.filter(p => p.status !== 'published');
    const total = D.publication_counts[String(y)] != null ? D.publication_counts[String(y)] : all.length;
    const li = p => `<li class="pub" id="p-${p.no}" data-no="${p.no}"><span class="pno" aria-label="Entry ${p.no}">${p.no}</span><div>${citeHtml(p, { coverTag: true })}</div></li>`;
    return `<section class="ygroup" id="y${y}" data-year="${y}" aria-labelledby="yh${y}">
      <div class="yhead"><h2 id="yh${y}">${y}</h2><p class="small"><span class="ycount" data-total="${total}">${total} ${total === 1 ? 'entry' : 'entries'}</span> · ${pub.length} published</p></div>
      ${pub.length ? `<ol class="pubs">${pub.map(li).join('')}</ol>` : ''}
      ${rest.length ? `<h3 class="ysub">Not yet published <span>(${rest.map(p => p.status).filter((s, i, a) => a.indexOf(s) === i).join(', ')})</span></h3><ol class="pubs">${rest.map(li).join('')}</ol>` : ''}
    </section>`;
  };
  $('pub-list').innerHTML = yearsAll.map(groupHtml).join('') + '<p class="empty" id="empty" hidden>No entries match these filters.</p>';
  const byNoEl = new Map([...document.querySelectorAll('.pub')].map(el => [+el.dataset.no, el]));
  pubs.forEach(p => items.push({ p, el: byNoEl.get(p.no),
    hay: [plain(p.title), plain(p.authors), p.journal || '', S.sourceLine(p)].join(' ').toLowerCase() }));
  const groups = [...document.querySelectorAll('.ygroup')];

  /* ---------- filters ---------- */
  const q = $('f-q'), fy = $('f-year'), fs = $('f-status'), fa = $('f-area'), fl = $('f-lab');
  fy.innerHTML = '<option value="">All years</option>' + yearsAll.map(y => `<option value="${y}">${y}</option>`).join('');
  fs.innerHTML = '<option value="">All statuses</option>' + statuses.map(s => `<option value="${esc(s)}">${esc(cap(s))}</option>`).join('');
  fa.innerHTML = '<option value="">All areas</option>' + D.research.areas.map(a => `<option value="${esc(a.numeral)}">${esc(a.numeral)} · ${esc(a.title)}</option>`).join('') +
    '<option value="none">Not assigned</option>';
  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', year: params.get('year') || '', status: params.get('status') || '', area: params.get('area') || '',
    lab: params.get('lab') === '1', journal: params.get('journal') || '' };
  q.value = state.q; fy.value = state.year; fs.value = state.status; fa.value = state.area; fl.checked = state.lab;
  if (fy.value !== state.year) state.year = '';
  if (fs.value !== state.status) state.status = '';
  if (fa.value !== state.area) state.area = '';

  function apply() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    items.forEach(({ p, el, hay }) => {
      const ok = (!state.year || p.year === +state.year) && (!state.status || p.status === state.status) &&
        (!state.area || (state.area === 'none' ? !p.area : p.area === state.area)) && (!state.lab || p.lab_led) &&
        (!state.journal || p.journal === state.journal) && terms.every(t => hay.includes(t));
      el.hidden = !ok; shown += ok;
    });
    groups.forEach(g => {
      const vis = g.querySelectorAll('.pub:not([hidden])').length, c = g.querySelector('.ycount'), t = +c.dataset.total;
      g.hidden = !vis;
      g.querySelectorAll('.pubs').forEach(ol => { ol.hidden = !ol.querySelector('.pub:not([hidden])'); });
      const sub = g.querySelector('.ysub'); if (sub) sub.hidden = sub.nextElementSibling.hidden;
      c.textContent = vis === g.querySelectorAll('.pub').length ? `${t} ${t === 1 ? 'entry' : 'entries'}` : `${vis} of ${t} entries shown`;
    });
    $('empty').hidden = shown > 0;
    const filtered = shown !== pubs.length;
    $('result-count').textContent = filtered ? `Showing ${fmt(shown)} of ${fmt(pubs.length)} entries` : `All ${fmt(pubs.length)} entries`;
    $('f-reset').hidden = !filtered;
    $('chips').innerHTML = state.journal ? `<button type="button" class="chip" data-clear="journal" aria-label="Remove journal filter ${esc(state.journal)}">Journal: ${esc(state.journal)} <span aria-hidden="true">×</span></button>` : '';
    document.querySelectorAll('#ystrip a').forEach(b => b.classList.toggle('on', b.dataset.y === state.year));
    const u = new URLSearchParams();
    ['q', 'year', 'status', 'area', 'journal'].forEach(k => { if (state[k]) u.set(k, state[k]); });
    if (state.lab) u.set('lab', '1');
    history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : '') + location.hash);
  }
  let tq = null;
  q.addEventListener('input', () => { clearTimeout(tq); tq = setTimeout(() => { state.q = q.value.trim(); apply(); }, 120); });
  fy.addEventListener('change', () => { state.year = fy.value; apply(); });
  fs.addEventListener('change', () => { state.status = fs.value; apply(); });
  fa.addEventListener('change', () => { state.area = fa.value; apply(); });
  fl.addEventListener('change', () => { state.lab = fl.checked; apply(); });
  $('filters').addEventListener('submit', e => e.preventDefault());
  $('chips').addEventListener('click', e => { if (e.target.closest('[data-clear]')) { state.journal = ''; apply(); } });
  $('f-reset').addEventListener('click', () => {
    Object.assign(state, { q: '', year: '', status: '', area: '', lab: false, journal: '' });
    q.value = ''; fy.value = ''; fs.value = ''; fa.value = ''; fl.checked = false; apply();
  });
  apply();

  /* ---------- Selected view ---------- */
  $('sel-pins').innerHTML = S.pinsHtml('sel-');
  $('sel-hl').innerHTML = S.highlightsHtml();
  $('sel-note').textContent = 'Chosen by the professor, grouped by research area';
  $('sel-hl-note').textContent = 'Recent lab-led papers, filled by the rule below';
  $('sel-rules').textContent = D.curation.rules;

  /* ---------- Covers view: front covers, then back/inside pages (archive only) ---------- */
  const card = c => {
    const p = pubOfCover.get(c), link = p ? pubLink(p) : href(c.url);
    const label = p ? `${esc(p.journal || S.sourceLine(p))} ${p.year}` : 'Journal cover';
    return `<li><figure class="cv-card"><a class="cv-img" href="${esc(link || '#')}" target="_blank" rel="noopener">
      <img src="${esc(asset(c.image))}" alt="${p ? `Journal cover: ${esc(plain(p.title))}` : 'Journal cover'}" loading="lazy"></a>
      <figcaption><b>${label}</b>${p ? `<br>${p.title}` : ''}</figcaption></figure></li>`;
  };
  const front = D.cover_publications.filter(c => c.kind !== 'back_page'), back = D.cover_publications.filter(c => c.kind === 'back_page');
  $('cv-sum').textContent = 'Journal covers featuring CCEL papers, newest first. Back and inside cover pages follow.';
  $('cv-front').innerHTML = front.map(card).join('');
  $('cv-back').innerHTML = back.map(card).join('');
  if (!back.length) $('cv-back-h').hidden = true;

  /* ---------- tabs via hash ---------- */
  const panels = ['all', 'selected', 'covers'];
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const view = panels.includes(h) ? h : 'all';
    panels.forEach(v => { $('view-' + v).hidden = v !== view; $('tab-' + v).setAttribute('aria-selected', String(v === view)); });
    if (h && !panels.includes(h)) {           // deep link to one entry, e.g. #p-283
      const t = document.getElementById(h);
      if (t) { if (t.hidden) $('f-reset').click(); requestAnimationFrame(() => t.scrollIntoView({ block: 'start' })); }
    }
  }
  window.addEventListener('hashchange', route);
  route();

  S.initHeader();
  S.initFooter();
})();
