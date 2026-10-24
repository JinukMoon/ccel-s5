/* People page: professor, current members and alumni from window.CCEL. Names and details stay in English. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, stats, asset, linkIcons, profLinks } = S;
  const $ = id => document.getElementById(id);
  const typeLabel = t => t ? S.cap(t) : 'Type not set';

  $('people-sub').innerHTML = `Current members and alumni of the ${esc(D.lab.name)}, led by ${esc(D.professor.name)}. ` +
    `<span class="legend" style="display:inline-flex;margin-left:6px"><span><i class="c"></i>Computational</span><span><i class="e"></i>Experimental</span></span>`;

  const P = D.professor;
  // Education lines are verbatim legacy text; only the check marks and " , " spacing are tidied for display.
  const edu = (P.sections && P.sections.Education || []).filter(l => l.trim() && l.trim() !== 'Education')
    .map(l => l.replace(/^✔\s*/, '').replace(/\s+,\s*/g, ', '));
  $('prof').innerHTML = `<img src="${esc(asset(P.photo))}" alt="${esc(P.name)}" width="180" height="231">
    <div><p class="eyebrow">Principal investigator</p><h3 style="margin-top:8px">${esc(P.name)}</h3>
    <p class="role">${esc(P.title)}</p>${P.roles.map(r => `<p class="role">${esc(r)}</p>`).join('')}
    <p class="meta"><a href="mailto:${esc(P.email)}">${esc(P.email)}</a><br>${esc(D.contact.professor_office)}</p>
    <p style="margin-top:12px">${linkIcons(P.name, profLinks())}</p>
    ${edu.length ? `<details class="fold"><summary>Education</summary><ul class="edu">${edu.map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>` : ''}</div>`;
  const gp = $('group-photo');
  if (D.contact.group_photo) { gp.src = asset(D.contact.group_photo); $('group-cap').textContent = D.lab.name; }
  else $('group-fig').remove();

  const photo = (p, w, h) => p.photo
    ? `<img class="pphoto" src="${esc(asset(p.photo))}" alt="${esc(p.name)}" loading="lazy" width="${w}" height="${h}">`
    : `<span class="pphoto none" aria-hidden="true"></span>`;
  const memberCard = p => `<li class="pcard" data-type="${esc(p.type || '')}">${photo(p, 400, 500)}
    <div class="pinfo"><h4>${esc(p.name)}</h4>
      <p class="ptype"><i class="tmark ${esc(p.type || 'none')}" aria-hidden="true"></i>${typeLabel(p.type)}</p>
      ${p.research_area ? `<p class="parea">${esc(p.research_area)}</p>` : ''}
      ${p.degrees && p.degrees.length ? `<ul class="pdeg">${p.degrees.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      <p class="pcontact">${p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : ''}${p.email && p.office ? '<br>' : ''}${p.office ? esc(p.office) : ''}</p>
      ${linkIcons(p.name, p.links)}</div></li>`;
  const alumCard = p => `<li class="pcard alum" data-type="${esc(p.type || '')}">${photo(p, 400, 500)}
    <div class="pinfo"><h4>${esc(p.name)}</h4>
      ${p.current_position ? `<p class="pnow">${esc(p.current_position)}</p>` : ''}
      <p class="ptype"><i class="tmark ${esc(p.type || 'none')}" aria-hidden="true"></i>${typeLabel(p.type)}</p>
      ${p.degrees && p.degrees.length ? `<ul class="pdeg">${p.degrees.map(d => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
      ${linkIcons(p.name, p.links)}</div></li>`;
  const groupsHtml = (groups, card, prefix) => groups.map((g, i) => `<div class="pgroup" id="${prefix}-${i}">
    <h3 class="pgroup-h">${esc(g.group)} <span class="small" data-total="${g.people.length}">${g.people.length}</span></h3>
    <ul class="pgrid${prefix === 'al' ? ' alum-grid' : ''}">${g.people.map(card).join('')}</ul></div>`).join('');
  $('member-groups').innerHTML = groupsHtml(D.members, memberCard, 'mg');
  $('alumni-groups').innerHTML = groupsHtml(D.alumni, alumCard, 'al');
  $('members-note').textContent = 'Grouped as in the lab list';
  $('alumni-note').textContent = 'Current position as last reported';

  // computational / experimental filter
  const filter = $('type-filter');
  const apply = t => {
    let shown = 0;
    document.querySelectorAll('.pcard').forEach(c => { const ok = !t || c.dataset.type === t; c.hidden = !ok; shown += ok; });
    document.querySelectorAll('.pgroup').forEach(g => {
      const vis = g.querySelectorAll('.pcard:not([hidden])').length, el = g.querySelector('[data-total]');
      g.hidden = vis === 0;
      el.textContent = t ? `${vis} of ${el.dataset.total}` : el.dataset.total;
    });
    $('filter-count').textContent = t ? `${shown} of ${stats.members + stats.alumni} people` : '';
  };
  filter.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    filter.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply(b.dataset.t);
  });

  S.initHeader();
  S.initFooter();
  S.settleHash();
})();
