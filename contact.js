/* Contact page (round v6), like source/contact_us.html: the group photo, then the lab name and the contact details,
   all from window.CCEL.contact. No map, no form. */
(function () {
  'use strict';
  const S = window.S5;
  const { D, esc, asset } = S;
  const $ = id => document.getElementById(id);
  const c = D.contact;

  const img = $('contact-photo');
  if (c.group_photo) { img.src = asset(c.group_photo); img.alt = `${c.lab_name || D.lab.name}: group photo`; }
  else $('contact-fig').remove();

  $('contact-lab').textContent = c.lab_name || D.lab.name;
  $('contact-dl').innerHTML = [
    ['Address', esc(c.address)],
    ['Email', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''],
    ['Professor office', esc(c.professor_office)],
    ['Laboratory', esc(c.laboratory)],
    ['Student office', esc(c.student_office)]
  ].filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  S.initHeader();
  S.initFooter();
  S.settleHash();
})();
