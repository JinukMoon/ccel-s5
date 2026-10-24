/* Landing page: hero scroll stage + data-forward sections, all rendered from window.CCEL. */
(function () {
  'use strict';
  const S = window.S5, C = window.S5charts;
  const { D, esc, fmt, stats, byNo, published, linkIcons, profLinks, asset } = S;
  const $ = id => document.getElementById(id);
  const ly = Math.max(...S.pubs.map(p => p.year));

  /* ---------------- hero scroll stage ----------------
     Sticky stage inside a 230vh wrapper (185vh under 960px). Scroll progress through the wrapper picks a frame
     from _shared/scroll/manifest.json "hero"; in the last third a white veil rises over the clip and the
     key-figure strip slides up, so the stage resolves into the "Lab at a glance" section below. */
  function initStage() {
    const wrap = document.querySelector('.stage-wrap');
    const stage = wrap.querySelector('.stage'), canvas = wrap.querySelector('.stage-canvas');
    const poster = wrap.querySelector('img.stage-poster'), veil = wrap.querySelector('.stage-veil'), strip = wrap.querySelector('.stage-strip');
    const base = S.SH + 'scroll/';
    const scrub = !S.reduceMotion() && !!canvas.getContext;
    if (scrub) wrap.classList.remove('is-static');   // synchronous, before first paint: no layout jump later

    fetch(base + 'manifest.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(man => {
      const seq = man.sequences && man.sequences.hero;
      if (!seq) throw new Error('no hero sequence');
      poster.src = base + seq.poster; poster.hidden = false;      // poster first, always
      if (!scrub) return;
      const m = window.innerWidth < 768 && seq.mobile ? seq.mobile : seq;
      const count = m.count, dir = m.dir, ib = man.index_base || 0;
      const file = i => (man.pattern || 'f_{index:03d}.webp').replace(/\{index(?::0?(\d+)d)?\}/, (x, w) => String(i + ib).padStart(+w || 0, '0'));
      const imgs = new Array(count), loaded = new Uint8Array(count);
      const ctx = canvas.getContext('2d');
      let cw = 0, ch = 0, drawn = -1, ticking = false;

      const size = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1), r = stage.getBoundingClientRect();
        const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
        if (w !== cw || h !== ch) { canvas.width = cw = w; canvas.height = ch = h; drawn = -1; }
      };
      const cover = img => {
        const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s;
        ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      };
      const nearest = i => { for (let d = 0; d < count; d++) { if (i - d >= 0 && loaded[i - d]) return i - d; if (i + d < count && loaded[i + d]) return i + d; } return -1; };
      const progress = () => {
        const top = parseFloat(getComputedStyle(stage).top) || 0, travel = wrap.offsetHeight - stage.offsetHeight;
        return travel > 0 ? Math.min(1, Math.max(0, (top - wrap.getBoundingClientRect().top) / travel)) : 0;
      };
      const render = () => {
        ticking = false;
        if (wrap.classList.contains('is-static')) return;
        size();
        const p = progress(), k = Math.min(1, Math.max(0, (p - 0.6) / 0.32));
        veil.style.opacity = (0.86 * k).toFixed(3);
        strip.style.transform = `translateY(${((1 - k) * 105).toFixed(2)}%)`;
        const f = nearest(Math.round(p * (count - 1)));
        if (f >= 0 && f !== drawn) { cover(imgs[f]); drawn = f; }       // redraw only when the frame changes
      };
      const schedule = () => { if (!ticking) { ticking = true; requestAnimationFrame(render); } };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      schedule();

      // progressive loading, 4 requests in flight. Keyframes (every 8th + last) after load; the gaps
      // (every 4th, 2nd, rest) only once the visitor first scrolls or interacts, so a bounce costs little.
      const queue = [], seen = new Uint8Array(count);
      const add = step => { for (let i = 0; i < count; i += step) if (!seen[i]) { seen[i] = 1; queue.push(i); } };
      let active = 0;
      const pump = () => {
        while (active < 4 && queue.length) {
          const i = queue.shift(), im = new Image();
          active++;
          im.decoding = 'async';
          im.onload = () => { imgs[i] = im; loaded[i] = 1; active--; schedule(); pump(); };
          im.onerror = () => { active--; pump(); };
          im.src = base + dir + '/' + file(i);
        }
      };
      let started = false, wantFill = false;
      const keyframes = () => {
        started = true; add(8);
        if (!seen[count - 1]) { seen[count - 1] = 1; queue.push(count - 1); }
        if (wantFill) [4, 2, 1].forEach(add);
        pump();
      };
      const INTENT = ['scroll', 'wheel', 'touchstart', 'keydown'];
      const fill = () => {
        INTENT.forEach(ev => window.removeEventListener(ev, fill));
        wantFill = true;
        if (started) { [4, 2, 1].forEach(add); pump(); }
      };
      // never compete with first paint: start after load, and only while the stage is near the viewport
      const start = () => {
        INTENT.forEach(ev => window.addEventListener(ev, fill, { passive: true, once: true }));
        if (!('IntersectionObserver' in window)) return keyframes();
        const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); keyframes(); } }, { rootMargin: '100% 0px' });
        io.observe(wrap);
      };
      if (document.readyState === 'complete') start(); else window.addEventListener('load', start, { once: true });
    }).catch(() => { wrap.classList.add('is-static'); });
  }

  /* ---------------- identity + key figures ---------------- */
  function identity() {
    $('lab-aff').textContent = D.lab.affiliation;
    $('lab-name').textContent = D.lab.name;
    $('lab-id').textContent = D.research.headline;
    const pipeStatuses = S.statusesPresent().filter(s => s !== 'published');
    const pipeLabel = pipeStatuses.length > 1 ? pipeStatuses.slice(0, -1).join(', ') + ' or ' + pipeStatuses.slice(-1) : pipeStatuses.join('');
    const figs = [
      [fmt(stats.published), `published papers, ${stats.firstYear}–${stats.lastYear}`],
      [fmt(stats.pipeline), pipeLabel],
      [fmt(stats.covers), 'journal covers'],
      [fmt(stats.areas), 'research areas'],
      [fmt(stats.members), 'current members'],
      [fmt(stats.alumni), 'alumni']
    ];
    $('keyfigs').innerHTML = `<li class="figs-title"><span class="t">Key figures</span><span class="s">Counted from the lab's data file on page load.</span></li>` +
      figs.map(([n, l]) => `<li class="fig"><span class="n">${n}</span><span class="l">${esc(l)}</span></li>`).join('');
  }

  /* ---------------- lab at a glance ---------------- */
  function glance() {
    $('glance-note').innerHTML = `${fmt(stats.total)} entries in the publication list · curated <span class="nowrap">${esc(D.curation.updated_at)}</span>`;
    $('ch-years-sum').textContent = `${fmt(stats.published)} published · ${fmt(stats.pipeline)} not yet published`;
    const thisYear = new Date().getFullYear();
    $('ch-years-cap').textContent = `Bars count published papers by year (${stats.firstYear}–${stats.lastYear})` +
      (stats.lastYear === thisYear ? `; ${thisYear} counts papers published so far this year` : '') +
      '. Papers in press, in revision or submitted are listed apart and are not in the bars. Select a bar to list that year’s papers.';
    C.yearsChart($('ch-years-body'));
    C.areaChart($('ch-areas-body'), $('ch-areas-mode'));
    C.journalChart($('ch-journals-body'));
    C.peopleChart($('ch-people-body'));
  }

  /* ---------------- research ---------------- */
  function research() {
    const R = D.research;
    $('research-note').textContent = `${R.areas.length} research areas`;
    $('research-headline').textContent = R.headline;
    $('research-intro').innerHTML = R.intro.map(t => `<p>${esc(t)}</p>`).join('');
    $('about-ko').textContent = D.welcome.about_ko;
    const img = $('research-img');
    img.src = asset(R.image); img.alt = 'CCEL research approach: artificial intelligence, computational materials design and experimental validation';
    const pins = D.curation.selected_pins;
    $('areas').innerHTML = R.areas.map(a => {
      const pre = `${a.numeral}. ${a.title}`;
      const sum = a.summary.startsWith(pre) ? a.summary.slice(pre.length).trim() : a.summary;
      const inArea = published.filter(p => p.area === a.numeral);
      const recent = inArea.filter(p => p.year >= ly - 2).length;
      const keys = pins.filter(x => x.area === a.numeral).map(x => byNo.get(x.no)).filter(Boolean)
        .map(p => `<a href="#pin-${p.no}">${esc(p.journal || S.sourceLine(p))} ${p.year}</a>`);
      return `<li class="area" id="area-${esc(a.numeral)}">
        <figure class="area-fig"><img src="${esc(asset(a.image))}" alt="Research area ${esc(a.numeral)}: ${esc(a.title)}" loading="lazy" width="240" height="240"></figure>
        <div>
          <h3><span class="numtag">${esc(a.numeral)}</span><span>${esc(a.title)}</span></h3>
          <p class="area-sum">${sum}</p>
          <ul class="kw" aria-label="Keywords">${a.keywords.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
          ${keys.length ? `<p class="area-keys"><b>Selected publication${keys.length > 1 ? 's' : ''}:</b> ${keys.join(', ')}</p>` : ''}
        </div>
        <div class="area-data">
          <p class="big">${inArea.length}</p>
          <p class="small">published papers in this area, ${recent} of them in ${ly - 2}–${ly}</p>
          <div class="mini-host" data-area="${esc(a.numeral)}"></div>
          <p class="more" style="margin-top:12px"><a href="publications.html?area=${encodeURIComponent(a.numeral)}">All papers in this area</a></p>
        </div></li>`;
    }).join('');
    document.querySelectorAll('.mini-host').forEach(el => C.miniArea(el, el.dataset.area));
  }

  /* ---------------- selected publications + recent highlights ---------------- */
  function publications() {
    const nPins = D.curation.selected_pins.filter(x => byNo.has(x.no)).length;
    $('pins-note').textContent = `${nPins} papers chosen by the professor, grouped by research area`;
    $('pins').innerHTML = S.pinsHtml();
    $('all-pubs-link').textContent = `All ${fmt(stats.total)} publications (${fmt(stats.published)} published)`;

    const nHl = D.curation.recent_highlights.filter(n => byNo.has(n)).length;
    $('hl-note').textContent = `${nHl} lab-led papers, filled by rule from the publication list`;
    $('hl').innerHTML = S.highlightsHtml();
    $('hl-rules').textContent = D.curation.rules;
    $('covers-link').textContent = `All journal covers (${fmt(stats.covers)})`;
  }

  /* ---------------- people preview ---------------- */
  function peoplePreview() {
    const P = D.professor;
    $('people-note').innerHTML = `${stats.members} current members · ${stats.alumni} alumni <span class="legend" style="display:inline-flex;margin-left:12px"><span><i class="c"></i>Computational</span><span><i class="e"></i>Experimental</span></span>`;
    $('prof').innerHTML = `<img src="${esc(asset(P.photo))}" alt="${esc(P.name)}" loading="lazy" width="180" height="231">
      <div><p class="eyebrow">Principal investigator</p><h3 style="margin-top:8px">${esc(P.name)}</h3>
      <p class="role">${esc(P.title)}</p>${P.roles.map(r => `<p class="role">${esc(r)}</p>`).join('')}
      <p class="meta"><a href="mailto:${esc(P.email)}">${esc(P.email)}</a> · ${esc(D.contact.professor_office)}</p>
      <p style="margin-top:12px">${linkIcons(P.name, profLinks())}</p></div>`;
    $('roster').innerHTML = D.members.map(g => `<div><h3>${esc(g.group)} <span>${g.people.length}</span></h3><ul>${g.people.map(p =>
      `<li><span class="nm"><i class="tmark ${esc(p.type || 'none')}" aria-hidden="true"></i>${esc(p.name)}<span class="sr-only"> (${esc(p.type || 'type not set')})</span></span>${linkIcons(p.name, p.links)}</li>`).join('')}</ul></div>`).join('');
    const gp = $('group-photo');
    if (D.contact.group_photo) gp.src = asset(D.contact.group_photo); else gp.closest('figure').remove();
  }

  /* ---------------- news, join, contact ---------------- */
  function rest() {
    $('news-list').innerHTML = D.welcome.news.map(n => `<li><span>${n.date ? `<time>${esc(n.date)}</time> · ` : ''}${esc(n.text)}</span></li>`).join('');
    $('join-mail').innerHTML = `<a href="mailto:${esc(D.professor.email)}">${esc(D.professor.name)} (${esc(D.professor.email)})</a>`;
    $('opening-ko').textContent = D.welcome.opening_ko;
    const c = D.contact;
    $('contact-dl').innerHTML = [['Address', esc(c.address)], ['Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`],
      ['Professor office', esc(c.professor_office)], ['Laboratory', esc(c.laboratory)], ['Student office', esc(c.student_office)]]
      .filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  }

  S.initHeader();
  initStage();
  identity(); glance(); research(); publications(); peoplePreview(); rest();
  S.initFooter();
  S.drawIn([...document.querySelectorAll('.chart, .area-data')]);
  S.settleHash();
})();
