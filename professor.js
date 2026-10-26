/* Professor page (round v6): the professor only, and only what source/prof.html shows (user rule 2026-10-26):
   photo, name, rank, role, department, address line, email, Google Citation and Curriculum Vitae links, then
   Education, Experience and Editorial & Professional Service with their dates. No office, phone, bio, counts or
   extra links. Everything from window.CCEL.professor (education / experience / service) and contact.address. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, asset, href, ICON } = S;
  const $ = id => document.getElementById(id);
  const P = D.professor;

  /* ---------- profile ---------- */
  // "Jeong Woo Han, Ph.D." is the heading of the legacy page (the professor.sections key); fall back to the name
  const fullName = Object.keys(P.sections || {}).find(k => k.startsWith(P.name + ',')) || P.name;
  // title = "Professor, Department of ..., Seoul National University" -> rank line + department line
  const cut = (P.title || '').indexOf(', ');
  const rank = cut > 0 ? P.title.slice(0, cut) : (P.title || ''), dept = cut > 0 ? P.title.slice(cut + 2) : '';
  // contact.address repeats the department; the legacy page shows the department once, then the street address
  let addr = D.contact.address || '';
  if (dept && addr.startsWith(dept)) addr = addr.slice(dept.length).replace(/^[\s,]+/, '');
  const pl = S.profLinks();
  const textLink = (k, url, label) => url
    ? `<a class="tlink" href="${esc(href(url))}" target="_blank" rel="noopener">${ICON[k][1]}<span>${esc(label)}</span></a>` : '';
  const links = [textLink('scholar', pl.scholar, 'Google Citation'), textLink('cv', pl.cv, 'Curriculum Vitae')].filter(Boolean).join('');
  const rows = [
    ['Address', esc(addr)],
    ['Email', P.email ? `<a href="mailto:${esc(P.email)}">${esc(P.email)}</a>` : ''],
    ['Links', links]
  ].filter(r => r[1]);
  $('prof-card').innerHTML = `${P.photo ? `<img class="prof-photo" src="${esc(asset(P.photo))}" alt="${esc(P.name)}" width="413" height="531">` : ''}
    <div class="prof-body">
      <h2 id="prof-name">${esc(fullName)}</h2>
      ${rank ? `<p class="prof-role">${esc(rank)}</p>` : ''}
      ${(P.roles || []).map(r => `<p class="prof-role">${esc(r)}</p>`).join('')}
      ${dept ? `<p class="prof-title">${esc(dept)}</p>` : ''}
      <dl class="prof-dl">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    </div>`;

  /* ---------- Education, Experience, Service: professor.education / experience / service ---------- */
  const period = s => String(s || '').replace(/\s+-\s+/g, ' – ');
  const cvHtml = list => list.map(b => `<li class="cv-row">
      <div class="cv-org">${b.org ? `<h3>${esc(b.org)}</h3>` : ''}${b.place ? `<p class="cv-place">${esc(b.place)}</p>` : ''}</div>
      <ul class="cv-items">${b.items.map(it => `<li>
        <div class="cv-what"><p class="cv-text">${esc(it.text)}</p>${(it.notes || []).map(n => `<p class="cv-note">${esc(n)}</p>`).join('')}</div>
        ${it.date ? `<p class="cv-date">${esc(period(it.date))}</p>` : ''}</li>`).join('')}</ul></li>`).join('');
  const edu = (P.education || []).map(e => ({
    org: e.institution, place: e.location,
    items: [{ text: `${e.degree}${e.honors ? ` (${e.honors})` : ''}, ${e.field}`, date: e.date,
      notes: [e.thesis ? `“${e.thesis}”` : '', e.advisor ? `Advisor: ${e.advisor}` : ''].filter(Boolean) }]
  }));
  const exp = (P.experience || []).map(x => ({
    org: x.institution, place: x.location,
    items: (x.roles || []).map(r => ({ text: r.unit ? `${r.title}, ${r.unit}` : r.title, date: r.period }))
  }));
  const svc = (P.service || []).map(s => ({ org: s.organization, items: [{ text: s.title, date: s.period }] }));
  [['education', 'edu-list', edu], ['experience', 'exp-list', exp], ['service', 'svc-list', svc]].forEach(([sec, list, data]) => {
    if (data.length) $(list).innerHTML = cvHtml(data); else $(sec).hidden = true;
  });

  S.initHeader();
  S.initFooter();
  S.settleHash();
})();
