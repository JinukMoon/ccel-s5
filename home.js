/* Landing page: hero scroll stage, then only the key information (as on the current Welcome page):
   News, Open Position, Selected Publications, About CCEL, Contact. All rendered from window.CCEL; no counts here. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, byNo, asset } = S;
  const $ = id => document.getElementById(id);

  /* ---------------- hero scroll stage ----------------
     Sticky stage inside a 200vh wrapper (170vh under 960px). Scroll progress through the wrapper picks a frame
     from _shared/scroll/manifest.json "hero"; in the last part a white veil rises over the clip, so the stage
     resolves into the white page that follows. */
  function initStage() {
    const wrap = document.querySelector('.stage-wrap');
    const stage = wrap.querySelector('.stage'), canvas = wrap.querySelector('.stage-canvas');
    const poster = wrap.querySelector('img.stage-poster'), veil = wrap.querySelector('.stage-veil');
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
        const p = progress(), k = Math.min(1, Math.max(0, (p - 0.55) / 0.4));
        veil.style.opacity = (0.8 * k).toFixed(3);
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

  /* ---------------- identity: lab name + the lab's own tagline ---------------- */
  function identity() {
    $('lab-aff').textContent = D.lab.affiliation;
    $('lab-name').textContent = D.lab.name;
    $('lab-id').textContent = D.welcome.tagline;
  }

  /* ---------------- news + open position ---------------- */
  function newsOpening() {
    $('news-list').innerHTML = D.welcome.news.map(n => `<li><span>${n.date ? `<time>${esc(n.date)}</time> · ` : ''}${esc(n.text)}</span></li>`).join('');
    $('opening-ko').textContent = D.welcome.opening_ko;
    const P = D.professor;
    $('opening-mail').innerHTML = `Applications and questions: ${esc(P.name)}, <a href="mailto:${esc(P.email)}">${esc(P.email)}</a>`;
  }

  /* ---------------- selected publications: curation.selected_pins, compact (title, one journal line, DOI) ---------------- */
  function selected() {
    $('pins').innerHTML = D.curation.selected_pins.filter(x => byNo.has(x.no)).map(x => {
      const p = byNo.get(x.no), link = S.pubLink(p), area = S.areaTitle(x.area);
      const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${p.title}</a>` : p.title;
      const src = esc(S.sourceLine(p).replace(/\.$/, ''));
      const doi = p.doi ? ` · <a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>` : '';
      return `<li class="anchor" id="pin-${p.no}">
        ${x.area ? `<p class="pc-area"><span class="numtag" aria-hidden="true">${esc(x.area)}</span><span class="sr-only">Research area ${esc(x.area)}: </span>${esc(area)}</p>` : ''}
        <p class="pc-title">${title}</p>
        <p class="pc-src">${src}${doi}</p></li>`;
    }).join('');
  }

  /* ---------------- about (Korean) + contact ---------------- */
  function aboutContact() {
    $('about-ko').textContent = D.welcome.about_ko;
    // the research-loop figure is large (~0.9 MB): request it only when About nears the viewport, not on first visit
    const img = $('research-img'), src = asset(D.research.image);
    img.alt = 'CCEL research approach: ' + D.research.headline;
    if (!('IntersectionObserver' in window)) img.src = src;
    else {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); img.src = src; } }, { rootMargin: '600px 0px' });
      io.observe($('about'));
    }
    const c = D.contact;
    $('contact-dl').innerHTML = [['Address', esc(c.address)], ['Email', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''],
      ['Professor office', esc(c.professor_office)], ['Laboratory', esc(c.laboratory)], ['Student office', esc(c.student_office)]]
      .filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }

  S.initHeader();
  initStage();
  identity(); newsOpening(); selected(); aboutContact();
  S.initFooter();
  S.settleHash();
})();
