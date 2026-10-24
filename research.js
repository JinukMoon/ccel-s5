/* Research page: research.headline / intro / image and the five research.areas, each with figure, summary, keywords,
   key papers (curation lists, used as given) and a link into the publication list filtered by area. No counts or charts. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, asset } = S;
  const $ = id => document.getElementById(id);
  const R = D.research;

  $('r-headline').textContent = R.headline;
  $('research-intro').innerHTML = R.intro.map(t => `<p>${esc(t)}</p>`).join('');
  const img = $('research-img');
  img.src = asset(R.image);
  img.alt = 'CCEL research approach: artificial intelligence, computational materials design and experimental validation';
  $('area-tabs').innerHTML = R.areas.map(a => `<a href="#area-${esc(a.numeral)}"><span class="numtag" aria-hidden="true">${esc(a.numeral)}</span>${esc(a.title)}</a>`).join('');

  const keyHtml = (p, tag) => {
    const link = S.pubLink(p);
    const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${p.title}</a>` : p.title;
    return `<li><p class="kp-title">${title}</p><p class="kp-src">${esc(S.sourceLine(p).replace(/\.$/, ''))} · <span class="kp-tag">${tag}</span></p></li>`;
  };

  $('areas').innerHTML = R.areas.map(a => {
    const pre = `${a.numeral}. ${a.title}`;
    const sum = a.summary.startsWith(pre) ? a.summary.slice(pre.length).trim() : a.summary;
    const keys = S.keyPapers(a.numeral);
    return `<li class="area anchor" id="area-${esc(a.numeral)}">
      <figure class="area-fig"><img src="${esc(asset(a.image))}" alt="Research area ${esc(a.numeral)}: ${esc(a.title)}" loading="lazy" width="240" height="240"></figure>
      <div>
        <h2 class="area-h"><span class="numtag">${esc(a.numeral)}</span><span>${esc(a.title)}</span></h2>
        <p class="area-sum">${sum}</p>
        <ul class="kw" aria-label="Keywords">${a.keywords.map(k => `<li>${esc(k)}</li>`).join('')}</ul>
        ${keys.length ? `<h3 class="kp-h">Key papers</h3><ol class="kp">${keys.map(([p, tag]) => keyHtml(p, tag)).join('')}</ol>` : ''}
        <p class="more area-more"><a href="publications.html?area=${encodeURIComponent(a.numeral)}">Papers in this area</a></p>
      </div></li>`;
  }).join('');

  S.initHeader();
  S.initFooter();
  S.settleHash();
})();
