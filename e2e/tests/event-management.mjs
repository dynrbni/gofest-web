import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const session = `gofest-event-management-${process.pid}`;
const shots = '/tmp/gofest-event-management-qa';
mkdirSync(shots, { recursive: true });
let fixture;
let uploadedKey;
function browser(...args) {
  const response = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(response.success, true, response.error?.message ?? args.join(' '));
  return response.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
function api(path, method = 'GET', body) {
  return evaluate(
    `fetch('/api/v1${path}',{method:${JSON.stringify(method)},credentials:'include',headers:{'Content-Type':'application/json'},body:${body === undefined ? 'undefined' : JSON.stringify(JSON.stringify(body))}}).then(async r=>({status:r.status,...await r.json()}))`,
  );
}
function open(path) {
  browser('open', new URL(path, base).href);
  wait(
    'Boolean(document.querySelector("main h1")) && !document.querySelector("main [aria-busy=true]") && !document.querySelector("[data-route-loading]")',
  );
}
function login(email, workspace) {
  browser('open', `${base}/login`);
  wait('Boolean(document.querySelector("#login-email")) && !document.querySelector("[inert]")');
  browser('find', 'label', 'Email', 'fill', email);
  browser('find', 'label', 'Password', 'fill', process.env.QA_PASSWORD ?? 'admin123');
  evaluate('document.querySelector("form").requestSubmit()');
  browser('wait', '--url', `**/${workspace}/dashboard`);
  wait('!document.querySelector("[data-sonner-toast]")');
}
function checkLayout(name) {
  for (const width of [1440, 1280, 1024, 390]) {
    browser('set', 'viewport', String(width), '900');
    evaluate('window.scrollTo(0,0)');
    const layout = evaluate(
      `(() => {const card=document.querySelector('aside[aria-labelledby="event-summary-heading"]');const form=document.querySelector('main form');const a=card.getBoundingClientRect(),b=form.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,position:getComputedStyle(card).position,side:a.left>=b.right,below:a.top>=b.bottom,width:a.width};})()`,
    );
    assert.equal(layout.overflow, false, `${name} ${width}px overflow`);
    if (width >= 1280) {
      assert.equal(layout.side, true, 'Summary is beside form');
      assert.equal(layout.position, 'sticky');
      assert.equal(layout.width, 320);
      evaluate('window.scrollTo(0,950)');
      wait(
        'Math.abs(document.querySelector("aside[aria-labelledby=event-summary-heading]").getBoundingClientRect().top-96)<2',
      );
      evaluate('window.scrollBy(0,200)');
      assert.ok(
        Math.abs(
          evaluate(
            'document.querySelector("aside[aria-labelledby=event-summary-heading]").getBoundingClientRect().top',
          ) - 96,
        ) < 2,
        'Summary stays sticky',
      );
    } else {
      assert.equal(layout.below, true, 'Summary stacks below form');
      assert.equal(layout.position, 'static');
    }
    evaluate('window.scrollTo(0,0)');
    browser('screenshot', `${shots}/${name}-${width}.png`);
    console.log(`PASS ${name} ${width}px: responsive summary and sticky behavior`);
  }
}
try {
  login('organizer@gofest.com', 'creator');
  open('/creator/events/new');
  assert.match(
    evaluate('document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText'),
    /Nama acara belum diisi/,
  );
  const category = api('/categories').data.categories[0];
  const unique = `event-summary-${Date.now()}`;
  const payload = {
    title: `QA Ringkasan ${unique}`,
    slug: unique,
    summary: 'Acara khusus untuk memeriksa ringkasan form.',
    description:
      'Deskripsi acara pengujian ringkasan yang dibuat sementara dan dihapus setelah pengecekan.',
    categoryId: category.id,
    type: 'OFFLINE',
    venueName: 'Gedung QA',
    address: 'Jalan Pengujian 1',
    city: 'Makassar',
    startsAt: '2027-02-01T09:00:00.000Z',
    endsAt: '2027-02-01T12:00:00.000Z',
    timezone: 'Asia/Makassar',
  };
  const created = api('/creator/events', 'POST', payload);
  assert.equal(created.status, 201);
  fixture = created.data.event.id;
  open(`/creator/events/${fixture}/edit`);
  wait('Boolean(document.querySelector("#title")?.value)');
  assert.equal(evaluate('document.querySelector("#startsAt").value'), '2027-02-01T17:00');
  assert.match(
    evaluate('document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText'),
    /17\.00/,
  );
  browser('find', 'label', 'Judul Acara', 'fill', `QA Live ${unique}`);
  browser('find', 'label', 'Nama Tempat / Venue', 'fill', 'Aula Baru');
  browser('find', 'label', 'Kota', 'fill', 'Denpasar');
  const summary = evaluate(
    'document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText',
  );
  assert.ok(
    summary.includes(`QA Live ${unique}`) &&
      summary.includes('Aula Baru') &&
      summary.includes('Denpasar'),
  );
  browser(
    'upload',
    'input[type=file]',
    new URL('../../apps/web/public/assets/gofest-admin-logo.png', import.meta.url).pathname,
  );
  wait(
    'Boolean(document.querySelector("aside[aria-labelledby=event-summary-heading] img")?.complete) && !document.querySelector("main [aria-busy=true]")',
  );
  uploadedKey = evaluate(
    'document.querySelector("aside[aria-labelledby=event-summary-heading] img").getAttribute("src").replace("/uploads/", "")',
  );
  assert.ok(uploadedKey.startsWith('events/'));
  evaluate('document.querySelector("main form").requestSubmit()');
  wait(
    `fetch('/api/v1/creator/events/${fixture}').then(r=>r.json()).then(body=>body.data.event.coverKey===${JSON.stringify(uploadedKey)})`,
  );
  wait('document.querySelector("main h1").textContent.includes("QA Live")');
  const saved = api(`/creator/events/${fixture}`).data.event;
  assert.equal(saved.startsAt, payload.startsAt, 'Saving must preserve event instant');
  assert.equal(saved.endsAt, payload.endsAt);
  assert.equal(saved.timezone, 'Asia/Makassar', 'Saving must preserve event timezone');
  assert.equal(saved.coverKey, uploadedKey);
  evaluate(
    `(() => {for(const [id,value] of [['startsAt','2027-02-01T18:15'],['endsAt','2027-02-01T21:30']]) {const input=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}})()`,
  );
  wait(
    'document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText.includes("18.15") && document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText.includes("21.30")',
  );
  evaluate('document.querySelector("input[type=radio][value=ONLINE]").click()');
  wait(
    'document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText.includes("Acara online")',
  );
  assert.equal(
    evaluate(
      'document.querySelector("aside[aria-labelledby=event-summary-heading]").innerText.includes("Aula Baru")',
    ),
    false,
  );
  evaluate('document.querySelector("input[type=radio][value=OFFLINE]").click()');
  checkLayout('creator');
  browser('set', 'viewport', '1440', '600');
  evaluate('window.scrollTo(0,950)');
  assert.ok(
    evaluate(
      'document.querySelector("aside[aria-labelledby=event-summary-heading]").getBoundingClientRect().height',
    ) <= 488,
  );
  const audit = browser('a11y', '--selector', 'main', '--tags', 'wcag2a,wcag2aa');
  writeFileSync(`${shots}/accessibility.json`, JSON.stringify(audit, null, 2));
  assert.equal(audit.counts.violations, 0);
  assert.deepEqual(browser('errors').errors, []);
  assert.equal(api(`/creator/events/${fixture}`, 'DELETE').status, 200);
  fixture = undefined;
  browser('close');

  for (const email of ['admin@gofest.com', 'superadmin@gofest.com']) {
    login(email, 'admin');
    const event = api('/admin/events?limit=1').data[0];
    assert.ok(event);
    browser('set', 'viewport', '1440', '900');
    open('/admin/events');
    const href = `/admin/events/${event.id}/edit`;
    wait(`Boolean(document.querySelector('main a[href="${href}"]'))`);
    const action = evaluate(
      `(()=>{const a=document.querySelector('main a[href="${href}"]');const range=document.createRange();range.selectNodeContents(a.firstChild);return {height:a.getBoundingClientRect().height,lines:range.getClientRects().length,text:a.textContent.trim()};})()`,
    );
    assert.equal(action.text, 'Kelola acara');
    assert.ok(action.height >= 44);
    assert.equal(action.lines, 1, 'Manage action label remains on one line');
    const moderation = evaluate(
      `(()=>{const row=[...document.querySelectorAll('tbody tr')].find(row=>[...row.querySelectorAll('button')].some(button=>button.textContent.trim()==='Publikasikan'));return row ? [...row.querySelectorAll('td:last-child a, td:last-child button')].map(button=>button.getBoundingClientRect().top) : [];})()`,
    );
    assert.ok(moderation.length >= 3);
    assert.ok(
      Math.max(...moderation) - Math.min(...moderation) < 1,
      'Moderation actions align on one row',
    );
    browser('screenshot', `${shots}/${email.split('@')[0]}-list.png`);
    evaluate(`document.querySelector('main a[href="${href}"]').click()`);
    browser('wait', '--url', `**${href}`);
    wait('Boolean(document.querySelector("aside[aria-labelledby=event-summary-heading]"))');
    checkLayout(email.split('@')[0]);
    const roleAudit = browser('a11y', '--selector', 'main', '--tags', 'wcag2a,wcag2aa');
    writeFileSync(
      `${shots}/${email.split('@')[0]}-accessibility.json`,
      JSON.stringify(roleAudit, null, 2),
    );
    assert.equal(roleAudit.counts.violations, 0);
    assert.deepEqual(browser('errors').errors, []);
    browser('close');
  }
  console.log(
    'PASS live summary, real banner save, timezone preservation, create/edit, one-line manage action, sticky/short-screen/mobile layouts, all3 roles, accessibility and no runtime errors',
  );
} catch (error) {
  console.error(
    'QA page state:',
    evaluate(
      '({path:location.pathname,alerts:[...document.querySelectorAll("main [role=alert]")].map(e=>e.textContent),invalid:[...document.querySelectorAll("main :invalid")].map(e=>e.id),uploadErrors:[...document.querySelectorAll("main [aria-invalid=true]")].map(e=>e.id)})',
    ),
  );
  throw error;
} finally {
  if (fixture) {
    const deleted = api(`/creator/events/${fixture}`, 'DELETE');
    assert.equal(deleted.status, 200);
  }
  if (uploadedKey) {
    const code = `import {prisma} from './src/lib/prisma';import {removePublicObject} from './src/lib/storage';(async()=>{await removePublicObject(${JSON.stringify(uploadedKey)});await prisma.mediaAsset.deleteMany({where:{key:${JSON.stringify(uploadedKey)}}});await prisma.$disconnect();})();`;
    execFileSync('pnpm', ['--filter', '@gofest/api', 'exec', 'tsx', '-e', code], {
      encoding: 'utf8',
    });
  }
  browser('close');
}
