import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const base = new URL(process.env.QA_BASE_URL ?? 'http://localhost:5173');
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) &&
    ['http:', 'https:'].includes(base.protocol) &&
    !base.username &&
    !base.password,
  'CMS field QA only runs against a local development website',
);
const session = process.env.QA_SESSION ?? `gofest-cms-fields-${process.pid}`;
const labels = [];
function browser(...args) {
  const r = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35000,
      maxBuffer: 4000000,
    }),
  );
  assert.equal(r.success, true, JSON.stringify(r.error));
  return r.data;
}
function evaluate(js) {
  return browser('eval', js).result;
}
function ready() {
  browser(
    'wait',
    '--fn',
    'Boolean(document.querySelector("main h1")) && !document.querySelector("main [aria-busy=true]")',
  );
}
function activate(text) {
  evaluate(
    `[...document.querySelectorAll('main button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`,
  );
}
function navigate(path) {
  evaluate(`document.querySelector('aside a[href="${path}"]').click()`);
  browser('wait', '--url', `**${path}`);
  ready();
}
try {
  browser('open', new URL('/login', base).href);
  browser(
    'wait',
    '--fn',
    'Boolean(document.querySelector("#login-email")) && !document.querySelector("[inert]")',
  );
  browser(
    'find',
    'label',
    'Email',
    'fill',
    process.env.QA_SUPERADMIN_EMAIL ?? 'superadmin@gofest.com',
  );
  browser('find', 'label', 'Password', 'fill', process.env.QA_PASSWORD ?? 'admin123');
  evaluate('document.querySelector("form").requestSubmit()');
  browser('wait', '--url', '**/admin/dashboard');
  ready();
  const menu = evaluate(
    '[...document.querySelector("aside nav").querySelectorAll("button")].find(b=>b.textContent.trim()==="Website").parentElement.innerText',
  );
  assert.equal(menu, 'Website\nBeranda\nBanner\nHalaman\nMenu & Footer\nIdentitas Web');
  navigate('/admin/cms/sections');
  evaluate(
    '[...document.querySelectorAll("main button[aria-pressed=true]")].find(button=>["Pilih sendiri","Paling laris","Event terdekat","Terbaru"].some(label=>button.textContent.startsWith(label))).click()',
  );
  browser(
    'wait',
    '--fn',
    '![...document.querySelectorAll("main [role=status]")].some(e=>e.textContent.includes("Menyimpan")||e.textContent.includes("Menunggu draft"))',
  );
  for (const [path, title] of [
    ['sections', 'Beranda'],
    ['banners', 'Banner'],
    ['pages', 'Halaman'],
    ['navigation', 'Menu & Footer'],
    ['settings', 'Identitas Web'],
  ]) {
    navigate(`/admin/cms/${path}`);
    assert.equal(evaluate('document.querySelector("main h1").textContent'), title);
  }
  for (const name of ['Identitas', 'Kontak & Sosmed', 'Footer link', 'SEO', 'Maintenance']) {
    browser('find', 'role', 'tab', 'click', '--name', name, '--exact');
    assert.equal(
      evaluate(
        `[...document.querySelectorAll('[role=tab]')].find(e=>e.textContent===${JSON.stringify(name)}).getAttribute('aria-selected')`,
      ),
      'true',
    );
  }
  navigate('/admin/cms/banners');
  activate('Tambah banner');
  assert.deepEqual(
    evaluate('[...document.querySelectorAll("main [role=tab]")].map(e=>e.textContent)'),
    ['Konten', 'Gambar', 'Tampilan'],
  );
  for (const name of ['Gambar', 'Tampilan', 'Konten']) {
    browser('find', 'role', 'tab', 'click', '--name', name, '--exact');
  }
  navigate('/admin/cms/pages');
  activate('Tambah halaman');
  assert.equal(
    evaluate(
      '[...document.querySelectorAll("main label")].some(e=>e.textContent.includes("Alamat halaman"))',
    ),
    true,
  );
  for (const placement of ['FOOTER', 'HEADER']) {
    navigate('/admin/cms/navigation');
    browser(
      'find',
      'role',
      'tab',
      'click',
      '--name',
      placement === 'FOOTER' ? 'Footer' : 'Header',
      '--exact',
    );
    activate('Tambah tautan');
    const label = `QA ${placement} ${Date.now()}`;
    labels.push(label);
    browser('find', 'label', 'Nama tautan', 'fill', label);
    if (placement === 'FOOTER') browser('select', 'main select', '/privacy');
    else {
      browser('select', 'main select', '__external__');
      browser('find', 'label', 'Alamat website tujuan', 'fill', 'https://example.com/gofest-qa');
    }
    const href = placement === 'FOOTER' ? '/privacy' : 'https://example.com/gofest-qa';
    assert.equal(
      evaluate(
        `[...document.querySelectorAll('main a')].find(a=>a.textContent===${JSON.stringify(label)})?.getAttribute('href')`,
      ),
      href,
    );
    let record = null;
    for (let attempt = 0; attempt < 20 && !record; attempt++) {
      record = evaluate(
        `fetch('/api/v1/admin/cms/navigation').then(r=>r.json()).then(b=>b.data.items.find(i=>i.draft.label===${JSON.stringify(label)}&&i.draft.href===${JSON.stringify(href)}))`,
      );
      if (!record) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    assert.ok(record, `autosave persisted ${placement} navigation`);
    assert.equal(record.draft.placement, placement);
    assert.equal(record.published, null);
    browser(
      'wait',
      '--fn',
      '![...document.querySelectorAll("main [role=status]")].some(e=>e.textContent.includes("Menyimpan"))',
    );
    const removed = evaluate(
      `fetch('/api/v1/admin/cms/navigation/${record.id}',{method:'DELETE',credentials:'include',headers:{'Content-Type':'application/json'}}).then(r=>r.status)`,
    );
    assert.equal(removed, 200);
    browser('open', new URL('/admin/cms/navigation', base).href);
    ready();
  }
  for (const width of [1440, 768, 390]) {
    browser('set', 'viewport', String(width), '900');
    assert.equal(
      evaluate('document.documentElement.scrollWidth>innerWidth+1'),
      false,
      `overflow at ${width}`,
    );
  }
  console.log(
    'PASS: no-op source choice settles, five sidebar entries, five identity tabs, three banner tabs, human page address, footer/header navigation autosave + immediate preview, 1440/768/390 no overflow; temporary records deleted.',
  );
} catch (error) {
  console.error(
    evaluate(
      '({path:location.pathname,statuses:[...document.querySelectorAll("main [role=status]")].map(e=>e.textContent)})',
    ),
  );
  throw error;
} finally {
  try {
    try {
      browser(
        'wait',
        '--fn',
        '![...document.querySelectorAll("main [role=status]")].some(e=>e.textContent.includes("Menyimpan"))',
      );
    } catch {
      /* Cleanup still removes records when an autosave status fails to settle. */
    }
    evaluate(`fetch('/api/v1/admin/cms/navigation').then(r=>r.json()).then(async body=>{
      const records=body.data?.items?.filter(item=>${JSON.stringify(labels)}.includes(item.draft.label)&&!item.published) ?? [];
      for(const record of records) {
        const response=await fetch('/api/v1/admin/cms/navigation/'+record.id,{method:'DELETE',credentials:'include'});
        if(!response.ok)throw new Error('Temporary navigation cleanup failed');
      }
      return records.length;
    })`);
  } finally {
    browser('close');
  }
}
