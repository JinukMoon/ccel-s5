/* Members page (round v6): current members first, alumni behind the Alumni button. One person per row, as on
   source/members.html: photo on the left, name with the computational/experimental mark, degrees, email, office,
   research area and link icons on the right. Everything from window.CCEL; names and details stay in English.
   The view follows the URL hash: #alumni (or an alumni group id) shows the alumni, anything else the current members. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, asset, linkIcons } = S;
  const $ = id => document.getElementById(id);
  const typeLabel = t => t ? S.cap(t) : 'Type not set';
  const P = D.professor;

  $('people-sub').innerHTML = `Current members of the ${esc(D.lab.name)}, led by <a href="professor.html">${esc(P.name)}</a>. ` +
    'Former members are listed under Alumni.';

  /* ---------- one row per person ---------- */
  // "Miyeon Kim (Chief of Lab)" -> name + small note; the text itself is unchanged
  const splitName = n => { const m = /^(.*?)\s*\((.*)\)\s*$/.exec(n || ''); return m ? [m[1], m[2]] : [n || '', '']; };
  // degree lines start with the degree, as on the legacy page ("PhD Chemical Engineering, POSTECH (2024)")
  const DEG = /^(Postdoc \/ Research Professor|Research Professor|Postdoc|MS\/PhD Course|PhD Course|PhD|MS|BS)\s+(.+)$/;
  const degLine = d => { const m = DEG.exec(d); return m ? `<li><b>${esc(m[1])}</b><span>${esc(m[2])}</span></li>` : `<li><span>${esc(d)}</span></li>`; };
  const photo = p => p.photo
    ? `<img class="rphoto" src="${esc(asset(p.photo))}" alt="${esc(splitName(p.name)[0])}" loading="lazy" decoding="async" width="400" height="500">`
    : `<span class="rphoto none" aria-hidden="true"></span>`;
  const row = (p, alum) => {
    const [name, note] = splitName(p.name);
    const meta = [
      p.email ? ['Email', `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`] : null,
      // keep phone numbers on one line (display only)
      p.office ? ['Office', esc(p.office).replace(/(\d{2,3}-\d{3,4}-\d{4})/g, '<span class="nowrap">$1</span>')] : null,
      p.research_area ? ['Research area', esc(p.research_area)] : null
    ].filter(Boolean);
    const icons = linkIcons(name, p.links);
    return `<li class="prow${alum ? ' alum' : ''}" data-type="${esc(p.type || '')}">${photo(p)}
      <div class="rbody">
        <div class="rhead"><h4>${esc(name)}</h4>
          <span class="ptype"><i class="tmark ${esc(p.type || 'none')}" aria-hidden="true"></i>${typeLabel(p.type)}</span>
          ${note ? `<span class="rnote">${esc(note)}</span>` : ''}</div>
        ${alum && p.current_position ? `<p class="rnow"><span class="rk">Current position</span> ${esc(p.current_position)}</p>` : ''}
        <div class="rcols">
          ${p.degrees && p.degrees.length ? `<ul class="rdeg">${p.degrees.map(degLine).join('')}</ul>` : ''}
          ${meta.length || icons ? `<div class="rmeta">${meta.map(([k, v]) => `<p><span class="rk">${k}</span> <span class="rv">${v}</span></p>`).join('')}${icons}</div>` : ''}
        </div>
      </div></li>`;
  };
  const groupsHtml = (groups, alum, prefix) => groups.map((g, i) => `<div class="pgroup anchor" id="${prefix}-${i}">
    <h3 class="pgroup-h">${esc(g.group)} <span class="small" data-total="${g.people.length}">${g.people.length}</span></h3>
    <ul class="plist">${g.people.map(p => row(p, alum)).join('')}</ul></div>`).join('');
  $('member-groups').innerHTML = groupsHtml(D.members, false, 'mg');
  $('alumni-groups').innerHTML = groupsHtml(D.alumni, true, 'al');
  $('members-note').textContent = 'Grouped as in the lab list';
  $('alumni-note').textContent = 'Current position as last reported';
  const jumps = (groups, prefix) => groups.map((g, i) => `<a href="#${prefix}-${i}">${esc(g.group)}</a>`).join('');
  $('jump-members').innerHTML = jumps(D.members, 'mg');
  $('jump-alumni').innerHTML = jumps(D.alumni, 'al');

  /* ---------- current members / alumni view, kept in sync with the hash ---------- */
  const views = { members: $('members'), alumni: $('alumni') };
  const viewOf = id => (id === 'alumni' || /^al-\d+$/.test(id)) ? 'alumni' : 'members';
  const hashId = () => { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; } };
  let view = null;
  function show(v) {
    if (v === view) return false;
    view = v;
    views.members.hidden = v !== 'members';
    views.alumni.hidden = v !== 'alumni';
    $('jump-members').hidden = v !== 'members';
    $('jump-alumni').hidden = v !== 'alumni';
    document.querySelectorAll('.viewswitch a').forEach(a => {
      if (a.dataset.view === v) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    document.title = `${v === 'alumni' ? 'Alumni' : 'Members'} · CCEL · Seoul National University`;
    applyFilter();
    return true;
  }
  // bring a heading into view only when it is not already on screen below the header
  function reveal(el) {
    if (!el) return;
    const h = el.querySelector('h2, h3') || el, r = h.getBoundingClientRect();
    const bar = document.querySelector('.site-bar'), top = bar ? bar.getBoundingClientRect().bottom : 0;
    if (r.top < top + 4 || r.top > window.innerHeight * (window.innerWidth < 768 ? 0.5 : 0.75)) el.scrollIntoView({ block: 'start' });
  }
  // view buttons: switch in place (the content below the bar changes), add a history entry so Back returns
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-view]');
    if (!a || e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    e.preventDefault();
    const v = a.dataset.view;
    if (location.hash !== '#' + v) history.pushState(null, '', '#' + v);
    show(v);
    reveal(views[v]);
  });
  // Back / Forward and typed hashes: the hash decides the view
  window.addEventListener('popstate', () => show(viewOf(hashId())));
  window.addEventListener('hashchange', () => {
    const id = hashId(), changed = show(viewOf(id));
    if (changed && id) reveal(document.getElementById(id));
  });

  /* ---------- computational / experimental filter (applies to the visible list) ---------- */
  const filter = $('type-filter');
  let type = '';
  function applyFilter() {
    let shown = 0, total = 0;
    document.querySelectorAll('.prow').forEach(c => { c.hidden = !!type && c.dataset.type !== type; });
    document.querySelectorAll('.pgroup').forEach(g => {
      const vis = g.querySelectorAll('.prow:not([hidden])').length, el = g.querySelector('[data-total]');
      g.hidden = vis === 0;
      el.textContent = type ? `${vis} of ${el.dataset.total}` : el.dataset.total;
      if (views[view] && views[view].contains(g)) { shown += vis; total += +el.dataset.total; }
    });
    $('filter-count').textContent = type ? `${shown} of ${total} ${view === 'alumni' ? 'alumni' : 'current members'}` : '';
  }
  filter.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    filter.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    type = b.dataset.t;
    applyFilter();
  });

  show(viewOf(hashId()));
  S.initHeader();
  S.initFooter();
  S.settleHash();
})();
