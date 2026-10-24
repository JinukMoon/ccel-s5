/* Inline-SVG charts drawn from window.CCEL at runtime. No chart library.
   Wide charts are full SVG; row charts keep their labels as HTML text (wraps, readable at 390px)
   with an SVG bar per row. Every mark carries its number as visible text. */
(function () {
  'use strict';
  const { D, esc, fmt, pct, cap, pubs, published, stats, areaByNum } = window.S5;

  const renderers = [];
  // re-render when a container's width changes (SVG text stays at real pixel sizes)
  function register(el, fn) {
    const r = { el, fn, w: 0 };
    renderers.push(r);
    r.w = el.clientWidth; fn(el, r.w);
    return r;
  }
  let t = null;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => renderers.forEach(r => { const w = r.el.clientWidth; if (w && w !== r.w) { r.w = w; r.fn(r.el, w); } }), 150);
  });

  const hbar = (parts, max) => {
    // parts: [{v, cls}] stacked left to right; widths are shares of `max`
    let x = 0;
    const rects = parts.map(p => {
      const w = max ? 100 * p.v / max : 0;
      const r = w > 0 ? `<rect class="bar ${p.cls || ''}" x="${x.toFixed(3)}" y="0" width="${w.toFixed(3)}" height="12" rx="0"/>` : '';
      x += w; return r;
    }).join('');
    return `<svg class="hbar" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="track" width="100" height="12"/>${rects}</svg>`;
  };
  const row = (o) => {
    const tag = o.href ? 'a' : 'div';
    const hrefAttr = o.href ? ` href="${esc(o.href)}"` : '';
    return `<li><${tag} class="hrow"${hrefAttr}${o.title ? ` title="${esc(o.title)}"` : ''}>
      <span class="hrow-lab">${o.label}</span>${hbar(o.parts, o.max)}<span class="hrow-val">${o.val}</span></${tag}></li>`;
  };
  const srTable = (caption, head, rows) => `<table class="sr-only"><caption>${esc(caption)}</caption>
    <thead><tr>${head.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`).join('')}</tr>`).join('')}</tbody></table>`;

  /* ---------- 1. Papers per year (published), pipeline shown apart ---------- */
  function yearData() {
    const counts = new Map();
    published.forEach(p => counts.set(p.year, (counts.get(p.year) || 0) + 1));
    const years = [];
    for (let y = stats.firstYear; y <= stats.lastYear; y++) years.push([y, counts.get(y) || 0]);
    const pipe = window.S5.statusesPresent().filter(s => s !== 'published')
      .map(s => [s, pubs.filter(p => p.status === s).length, [...new Set(pubs.filter(p => p.status === s).map(p => p.year))]]);
    return { years, pipe };
  }
  function yearsChart(host) {
    const { years, pipe } = yearData();
    const max = Math.max(...years.map(y => y[1]), ...pipe.map(p => p[1]));
    host.innerHTML = `<div class="years-layout"><div class="chart-body yc-main"></div>
      <div class="pipe"><h4>Not yet published</h4><p>Counted apart from the yearly bars.</p>
      <ul class="hrows">${pipe.map(([s, n, ys]) => row({ label: `${esc(cap(s))} <span class="small">(${ys.join(', ')})</span>`, parts: [{ v: n, cls: 'pipe' }], max, val: `<b>${n}</b>`, href: `publications.html?status=${encodeURIComponent(s)}` })).join('')}</ul></div></div>
      ${srTable('Published papers per year', ['Year', 'Published papers'], years.map(([y, n]) => [y, n]))}
      ${srTable('Papers not yet published', ['Status', 'Papers'], pipe.map(([s, n]) => [cap(s), n]))}`;
    register(host.querySelector('.yc-main'), (el, W) => {
      if (W < 520) { // narrow: one row per year, newest first
        el.innerHTML = `<ul class="hrows cols short">${years.slice().reverse().map(([y, n]) => row({ label: String(y), parts: [{ v: n }], max, val: `<b>${n}</b>`, href: `publications.html?year=${y}&status=published` })).join('')}</ul>`;
        return;
      }
      const H = 280, top = 24, bottom = 30, ph = H - top - bottom, n = years.length;
      const slot = W / n, bw = Math.max(5, Math.min(34, slot * 0.64)), ymax = Math.max(...years.map(y => y[1]));
      const every = slot >= 40 ? 1 : slot >= 24 ? 2 : 5;
      const bars = years.map(([y, c], i) => {
        const h = ymax ? ph * c / ymax : 0, x = i * slot + (slot - bw) / 2, yy = top + ph - h;
        const showY = every === 1 || y % every === 0 || i === n - 1;
        return `<a href="publications.html?year=${y}&amp;status=published" aria-label="${y}: ${c} published papers">
          <g><title>${y}: ${c} published papers</title>
          <rect class="bar" x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" style="transition-delay:${i * 25}ms"/>
          ${c ? `<text class="vl" x="${(x + bw / 2).toFixed(1)}" y="${(yy - 7).toFixed(1)}" text-anchor="middle">${c}</text>` : ''}
          ${showY ? `<text class="yl" x="${(x + bw / 2).toFixed(1)}" y="${top + ph + 20}" text-anchor="middle">${y}</text>` : ''}</g></a>`;
      }).join('');
      el.innerHTML = `<svg class="vbars" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="yc-t yc-d">
        <title id="yc-t">Published papers per year, ${years[0][0]}–${years[n - 1][0]}</title>
        <desc id="yc-d">${years.map(([y, c]) => `${y}: ${c}`).join('; ')}.</desc>
        <line class="base" x1="0" x2="${W}" y1="${top + ph + .5}" y2="${top + ph + .5}"/>${bars}</svg>`;
    });
  }

  /* ---------- 2. Share of papers per research area ---------- */
  function areaChart(host, modeHost) {
    const ly = Math.max(...pubs.map(p => p.year));
    const modes = [
      { key: 'all', label: `All years (${stats.firstYear}–${stats.lastYear})`, set: published },
      { key: 'recent', label: `${ly - 2}–${ly}`, set: published.filter(p => p.year >= ly - 2) }
    ];
    let mode = modes[0];
    const draw = () => {
      const N = mode.set.length;
      const rows = D.research.areas.map(a => [a.numeral, a.title, mode.set.filter(p => p.area === a.numeral).length]);
      const none = mode.set.filter(p => !p.area || !areaByNum.has(p.area)).length;
      if (none) rows.push([null, 'Not assigned to an area yet', none]);
      const max = Math.max(...rows.map(r => r[2]));
      host.innerHTML = `<ul class="hrows">${rows.map(([num, title, n]) => row({
        label: num ? `<span class="numtag">${esc(num)}</span>${esc(title)}` : `<span class="numtag" aria-hidden="true">–</span>${esc(title)}`,
        parts: [{ v: n, cls: num ? '' : 'na' }], max, val: `<b>${n}</b> · ${pct(n, N)}`,
        href: `publications.html?area=${num || 'none'}&status=published`
      })).join('')}</ul>
      <p class="small" style="margin-top:12px">${fmt(N)} published papers in this view; shares add up to 100%.</p>`;
    };
    modeHost.innerHTML = `<span class="seg" role="group" aria-label="Period">${modes.map((m, i) =>
      `<button type="button" data-k="${m.key}" aria-pressed="${i === 0}">${esc(m.label)}</button>`).join('')}</span>`;
    modeHost.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      mode = modes.find(m => m.key === b.dataset.k);
      modeHost.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    });
    draw();
  }

  /* ---------- 3. Top journals by number of published papers ---------- */
  function journalChart(host, k = 10) {
    const c = new Map();
    published.forEach(p => { if (p.journal) c.set(p.journal, (c.get(p.journal) || 0) + 1); });
    const top = [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, k);
    const missing = published.filter(p => !p.journal).length;
    const max = top.length ? top[0][1] : 0;
    host.innerHTML = `<ul class="hrows cols">${top.map(([j, n]) => row({ label: esc(j), parts: [{ v: n }], max, val: `<b>${n}</b>`,
      href: `publications.html?journal=${encodeURIComponent(j)}&status=published` })).join('')}</ul>
      <p class="small" style="margin-top:12px">${c.size} journals in total.${missing ? ` ${missing} published entries carry no journal field and are not counted here.` : ''}</p>`;
    return { top, missing, journals: c.size };
  }

  /* ---------- 4. People: members and alumni by group, computational vs experimental ---------- */
  function peopleChart(host) {
    const groupRows = groups => groups.map(g => {
      const c = g.people.filter(p => p.type === 'computational').length, e = g.people.filter(p => p.type === 'experimental').length;
      return [g.group, c, e, g.people.length - c - e];
    });
    const m = groupRows(D.members), a = groupRows(D.alumni);
    const max = Math.max(...m.concat(a).map(r => r[1] + r[2] + r[3]));
    const val = ([, c, e, o]) => `<b>${c + e + o}</b>${c + e + o ? ` · ${c} comp. / ${e} exp.${o ? ` / ${o} n/a` : ''}` : ''}`;
    const block = (title, rows, link) => `<p class="people-sub">${title}</p><ul class="hrows">${rows.map(r => row({
      label: esc(r[0]), parts: [{ v: r[1] }, { v: r[2], cls: 'exp' }, { v: r[3], cls: 'na' }], max, val: val(r), href: link })).join('')}</ul>`;
    host.innerHTML = block(`Current members · ${stats.members}`, m, 'members.html#members') + block(`Alumni · ${stats.alumni}`, a, 'members.html#alumni');
  }

  /* ---------- mini: published papers per year in one research area (last 10 years) ---------- */
  function miniArea(el, numeral) {
    const ly = stats.lastYear, years = [];
    for (let y = ly - 9; y <= ly; y++) years.push([y, published.filter(p => p.area === numeral && p.year === y).length]);
    register(el, (host, W) => {
      W = W || 260;
      const H = 92, top = 16, bottom = 18, ph = H - top - bottom, slot = W / years.length, bw = Math.min(18, slot * 0.62);
      const max = Math.max(1, ...years.map(y => y[1]));
      host.innerHTML = `<svg class="mini" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Published papers per year in area ${esc(numeral)}: ${years.map(([y, c]) => `${y} ${c}`).join(', ')}">
        <line class="base" x1="0" x2="${W}" y1="${top + ph + .5}" y2="${top + ph + .5}" stroke="#cdd1dd"/>
        ${years.map(([y, c], i) => { const h = ph * c / max, x = i * slot + (slot - bw) / 2, yy = top + ph - h;
          return `<g><title>${y}: ${c}</title>${c ? `<rect class="bar" x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"/><text class="vl" x="${(x + bw / 2).toFixed(1)}" y="${(yy - 4).toFixed(1)}" text-anchor="middle">${c}</text>` : ''}
          ${i === 0 || i === years.length - 1 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${H - 3}" text-anchor="${i ? 'end' : 'start'}" dx="${i ? bw / 2 : -bw / 2}">${y}</text>` : ''}</g>`; }).join('')}</svg>`;
    });
    return years;
  }

  window.S5charts = { yearsChart, yearData, areaChart, journalChart, peopleChart, miniArea, register };
})();
