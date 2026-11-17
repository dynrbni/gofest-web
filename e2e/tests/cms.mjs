import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'CMS mutation QA runs only against a local development server',
);
const session = `gofest-cms-${process.pid}`;
const unique = `cms-qa-${Date.now()}`;
const shots = '/tmp/gofest-cms-qa';
mkdirSync(shots, { recursive: true });
const created = { pages: [], banners: [] };
let featuredBackup;
let uploadedKey;
let settingsBackup;
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
const click = (label) => browser('find', 'role', 'button', 'click', '--name', label, '--exact');
const fill = (label, value) => browser('find', 'label', label, 'fill', value);
function api(path, method = 'GET', body) {
  return evaluate(
    `fetch('/api/v1${path}', {method:${JSON.stringify(method)},credentials:'include',headers:{'Content-Type':'application/json'},body:${body === undefined ? 'undefined' : JSON.stringify(JSON.stringify(body))}}).then(async response=>({status:response.status,...await response.json()}))`,
  );
}
function normalizedSettings(document) {
  if (document === null) return null;
  const code = `import {websiteSchema} from './src/modules/cms/cms.schemas';process.stdout.write(JSON.stringify(websiteSchema.parse(${JSON.stringify(document)})));`;
  return JSON.parse(
    execFileSync('pnpm', ['--filter', '@gofest/api', 'exec', 'tsx', '-e', code], {
      encoding: 'utf8',
      timeout: 15000,
    }),
  );
}
function open(path) {
  browser('open', new URL(path, base).href);
  wait(
    '!document.querySelector("[data-page-loading], [data-route-loading]") && Boolean(document.querySelector("h1"))',
  );
  wait('!document.querySelector("main [aria-busy=true]")');
}
function login(email, destination) {
  browser('open', `${base}/login`);
  wait('document.querySelector("#login-email") && !document.querySelector("[inert] #login-email")');
  fill('Email', email);
  fill('Password', process.env.QA_PASSWORD ?? 'admin123');
  evaluate('document.querySelector("form").requestSubmit()');
  browser('wait', '--url', `**${destination}`);
  wait('Boolean(document.querySelector("main h1"))');
}
function recordAction(title, action) {
  evaluate(
    `(()=>{const heading=[...document.querySelectorAll('main h2,main h3,main td')].find(element=>element.textContent===${JSON.stringify(title)});if(!heading)throw Error('Record missing');const row=heading.closest('li,tr')??heading.closest('section');const button=[...row.querySelectorAll('button')].find(element=>element.textContent.trim().startsWith(${JSON.stringify(action)}));if(!button)throw Error('Action missing');button.click()})()`,
  );
}
function saved() {
  wait(
    "!document.querySelector('main')?.innerText.includes('Menyimpan perubahan...') && !document.querySelector('main')?.innerText.includes('Menunggu draft dan unggahan selesai...')",
  );
}
function publish() {
  saved();
  wait(
    "!Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Terbitkan ke website')?.disabled",
  );
  click('Terbitkan ke website');
  confirm('Terbitkan ke website');
  wait("document.querySelector('main')?.innerText.includes('0 perubahan belum diterbitkan')");
}
function confirm(label) {
  browser('wait', '[role=alertdialog]');
  evaluate(
    `[...document.querySelectorAll('[role=alertdialog] button')].find(button=>button.textContent.trim()===${JSON.stringify(label)}).click()`,
  );
  wait('!document.querySelector("[role=alertdialog]")');
}
function assertLayout(name) {
  assert.equal(
    evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
    false,
    `${name} no page overflow`,
  );
  assert.equal(
    evaluate('document.body.innerText.includes("Halaman belum bisa ditampilkan.")'),
    false,
    `${name} no route crash`,
  );
  assert.deepEqual(
    evaluate(
      '[...document.querySelectorAll("main [role=alert]")].map(element=>element.textContent)',
    ),
    [],
    `${name} no data errors`,
  );
}
try {
  login('superadmin@gofest.com', '/admin/dashboard');
  for (const width of [1440, 820, 390]) {
    browser('set', 'viewport', String(width), '1000');
    for (const path of [
      '/admin/cms',
      '/admin/cms/sections',
      '/admin/cms/banners',
      '/admin/cms/pages',
      '/admin/cms/navigation',
      '/admin/cms/settings',
      '/admin/featured-events',
    ]) {
      open(path);
      assertLayout(`${width}px ${path}`);
      process.stdout.write(`PASS ${width}px ${path}\n`);
    }
    open('/admin/cms/pages');
    click('Tambah halaman');
    wait('Boolean(document.querySelector("main textarea"))');
    assertLayout(`${width}px CMS editor`);
    browser('screenshot', `${shots}/editor-${width}.png`);
    click('Tutup editor');
  }
  browser('set', 'viewport', '1440', '1000');
  open('/admin/cms/pages');
  click('Tambah halaman');
  fill('Judul halaman', unique);
  fill('Isi halaman', `## Acara dan cerita\nKonten nyata pengujian ${unique}.`);
  fill('Judul di hasil pencarian', `SEO ${unique}`);
  saved();
  const page = api('/admin/cms/pages').data.items.find((item) => item.draft.slug === unique);
  assert.ok(page, 'UI creates persisted draft');
  created.pages.push(page.id);
  assert.equal(api(`/cms/pages/${unique}`).status, 404, 'draft absent publicly');
  const concurrent = api(`/admin/cms/pages/${page.id}`, 'PATCH', {
    document: { ...page.draft, seoDescription: 'Versi dari tab lain' },
    expectedVersion: page.version,
  });
  assert.equal(concurrent.status, 200);
  fill('Isi halaman', 'Perubahan dari editor yang masih memakai versi lama.');
  wait('document.body.innerText.includes("Konten telah diubah di tempat lain")');
  assert.equal(
    evaluate('[...document.querySelectorAll("main textarea")].at(-1).value'),
    'Versi dari tab lain',
  );
  click('Saya sudah memeriksa');
  fill('Isi halaman', `## Acara dan cerita\nKonten nyata pengujian ${unique}.`);
  saved();
  process.stdout.write('PASS autosave conflict refetches latest version and supports recovery\n');
  open(`/admin/cms/preview?page=${unique}`);
  wait(`document.body.innerText.includes(${JSON.stringify(unique)})`);
  assert.ok(
    evaluate('document.body.innerText').includes('Konten nyata pengujian'),
    'actual draft page preview renders Markdown',
  );
  open('/admin/cms/pages');
  publish();
  open(`/pages/${unique}`);
  wait(`document.querySelector('h1')?.textContent===${JSON.stringify(unique)}`);
  assert.ok(
    evaluate('document.body.innerText').includes('Acara dan cerita'),
    'published page renders website content',
  );
  assert.equal(evaluate('document.title'), `SEO ${unique}`, 'published SEO title applied');
  open('/admin/cms/pages');
  click(`Opsi ${unique}`);
  click('Tarik dari website');
  confirm('Tarik dari website');
  wait(`fetch('/api/v1/cms/pages/${unique}').then(r=>r.status===404)`);
  assert.equal(api(`/cms/pages/${unique}`).status, 404, 'unpublish removes public page');
  process.stdout.write(
    'PASS page create draft / actual preview / publish / public SEO / unpublish\n',
  );

  const featured = api('/admin/cms/sections').data.items.find(
    (item) => item.key === 'events-for-you',
  );
  assert.ok(featured, 'featured section seeded');
  featuredBackup = featured;
  open('/admin/featured-events');
  fill('Judul bagian', `Featured ${unique}`);
  evaluate(`document.querySelector('a[href="/admin/cms/banners"]').click()`);
  browser('wait', '--url', '**/admin/cms/banners');
  assert.equal(
    api('/admin/cms/sections').data.items.find((item) => item.id === featured.id).draft.title,
    `Featured ${unique}`,
    'sidebar navigation waits for autosave',
  );
  const currentPublic = api('/cms/site').data.sections.find(
    (item) => item.key === 'events-for-you',
  );
  assert.notEqual(currentPublic?.title, `Featured ${unique}`, 'featured draft isolated publicly');
  open('/admin/cms/preview');
  wait(`document.body.innerText.includes(${JSON.stringify(`Featured ${unique}`)})`);
  assert.ok(
    evaluate('document.body.innerText').includes(`Featured ${unique}`),
    'actual homepage draft preview uses edited section',
  );
  process.stdout.write('PASS featured draft title appears only in actual preview\n');

  open('/admin/cms/banners');
  click('Tambah banner');
  fill('Judul banner', `Banner ${unique}`);
  saved();
  browser('find', 'role', 'tab', 'click', '--name', 'Gambar', '--exact');
  browser(
    'upload',
    'input[type=file]',
    process.env.QA_IMAGE ?? `${process.cwd()}/apps/web/public/assets/gofest-admin-logo.png`,
  );
  wait(
    'document.querySelector("main input[type=file]").closest("div[aria-busy]").querySelector("img") && !document.querySelector("main [aria-busy=true]")',
  );
  assert.equal(
    evaluate(
      'document.querySelector("main input[type=file]").closest("div[aria-busy]").querySelector("img").naturalWidth > 0',
    ),
    true,
    'real uploaded image preview loads',
  );
  saved();
  browser('find', 'role', 'tab', 'click', '--name', 'Konten', '--exact');
  fill('Teks tombol', 'Cari acara');
  const destination = evaluate("[...document.querySelectorAll('main select')].find(element => element.labels?.[0]?.textContent.includes('Tujuan tombol'))?.id");
  assert.ok(destination);
  browser('select', `#${destination.replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1')}`, '/events');
  saved();
  const banner = api('/admin/cms/banners').data.items.find(
    (item) => item.draft.title === `Banner ${unique}`,
  );
  assert.ok(banner?.draft.imageKey, 'banner image persists on server');
  created.banners.push(banner.id);
  uploadedKey = banner.draft.imageKey;
  open('/admin/cms/banners');
  recordAction(`Banner ${unique}`, 'Ubah');
  browser('find', 'role', 'tab', 'click', '--name', 'Gambar', '--exact');
  wait('Boolean(document.querySelector("main input[type=file]"))');
  assert.ok(
    evaluate(
      'document.querySelector("main input[type=file]").closest("div[aria-busy]").querySelector("img").src',
    ).includes(uploadedKey),
    'banner survives reopening editor',
  );
  publish();
  open('/');
  wait(`Boolean(document.querySelector('img[src*="${uploadedKey}"]'))`);
  assert.equal(
    evaluate(`document.querySelector('img[src*="${uploadedKey}"]').naturalWidth > 0`),
    true,
    'published CMS banner renders on actual homepage',
  );
  process.stdout.write('PASS banner upload / saved image / actual public publish\n');

  settingsBackup = api('/admin/cms/settings').data.items.find((item) => item.key === 'general');
  assert.ok(settingsBackup, 'general website settings seeded');
  const settings = {
    ...settingsBackup.draft,
    websiteName: `GOFEST ${unique}`,
    seoTitle: `Beranda ${unique}`,
    description: `Deskripsi ${unique}`,
    seoDescription: `SEO deskripsi ${unique}`,
    primaryColor: '#164E63',
    secondaryColor: '#713F12',
    announcement: `Pengumuman ${unique}`,
    footerDescription: `Footer ${unique}`,
    copyright: `Hak cipta ${unique}`,
    instagram: 'https://www.instagram.com/gofest-qa/',
    email: 'cms-qa@example.com',
    siteUrl: 'https://gofest-qa.example.com',
    timezone: 'Asia/Makassar',
    defaultLanguage: 'id',
    maintenance: false,
  };
  let savedSettings = api(`/admin/cms/settings/${settingsBackup.id}`, 'PATCH', {
    document: settings,
    expectedVersion: settingsBackup.version,
  });
  assert.equal(savedSettings.status, 200);
  assert.equal(
    api(`/admin/cms/settings/${settingsBackup.id}/publish`, 'POST', {
      expectedVersion: savedSettings.data.item.version,
    }).status,
    200,
  );
  open('/');
  wait(`document.title===${JSON.stringify(`Beranda ${unique}`)}`);
  const applied = evaluate(
    `({title:document.title,siteName:document.documentElement.dataset.siteName,primaryButton:getComputedStyle(document.querySelector('.primary-action')).backgroundColor,footerBorder:getComputedStyle(document.querySelector('footer')).borderTopColor,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,primary:getComputedStyle(document.querySelector('.public-shell')).getPropertyValue('--cms-primary').trim(),secondary:getComputedStyle(document.querySelector('.public-shell')).getPropertyValue('--cms-secondary').trim(),timezone:document.documentElement.dataset.siteTimezone,body:document.body.innerText,footer:document.querySelector('footer')?.innerText,instagram:Boolean(document.querySelector('footer a[href="https://www.instagram.com/gofest-qa/"]'))})`,
  );
  assert.equal(applied.title, `Beranda ${unique}`);
  assert.equal(applied.siteName, `GOFEST ${unique}`);
  assert.equal(applied.primaryButton, 'rgb(22, 78, 99)');
  assert.equal(applied.footerBorder, 'rgb(113, 63, 18)');
  assert.equal(applied.description, `SEO deskripsi ${unique}`);
  assert.equal(applied.canonical, 'https://gofest-qa.example.com/');
  assert.equal(applied.primary.toLowerCase(), '#164e63');
  assert.equal(applied.secondary.toLowerCase(), '#713f12');
  assert.equal(applied.timezone, 'Asia/Makassar');
  assert.ok(applied.body.includes(`Pengumuman ${unique}`));
  assert.ok(applied.footer.includes(`Footer ${unique}`));
  assert.ok(applied.footer.includes(`Hak cipta ${unique}`));
  assert.equal(applied.instagram, true);
  process.stdout.write(
    'PASS published branding / SEO / canonical / colors / timezone / footer / announcement / social\n',
  );
  let currentSettings = api('/admin/cms/settings').data.items.find(
    (item) => item.id === settingsBackup.id,
  );
  savedSettings = api(`/admin/cms/settings/${settingsBackup.id}`, 'PATCH', {
    document: { ...settings, maintenance: true, maintenanceMessage: `Maintenance ${unique}` },
    expectedVersion: currentSettings.version,
  });
  assert.equal(savedSettings.status, 200);
  assert.equal(
    api(`/admin/cms/settings/${settingsBackup.id}/publish`, 'POST', {
      expectedVersion: savedSettings.data.item.version,
    }).status,
    200,
  );
  for (const path of ['/', '/events', '/checkout/cms-test-slug']) {
    open(path);
    assert.ok(evaluate('document.querySelector("h1").textContent').includes('pemeliharaan'));
    assert.ok(evaluate('document.body.innerText').includes(`Maintenance ${unique}`));
  }
  open('/admin/cms');
  assert.equal(evaluate('document.querySelector("main h1").textContent'), 'Beranda');
  assert.equal(api('/auth/me').status, 200, 'authentication remains available during maintenance');
  browser('open', `${base}/login`);
  wait('Boolean(document.querySelector("#login-email")) || location.pathname==="/admin/dashboard"');
  assert.equal(
    evaluate('document.body.innerText.includes("Website sedang dalam pemeliharaan")'),
    false,
    'login excluded from maintenance',
  );
  process.stdout.write(
    'PASS published maintenance on home/catalog; CMS dashboard/auth/login remain available\n',
  );
  open('/admin/cms');
  const audit = browser('a11y', '--tags', 'wcag2a,wcag2aa');
  assert.equal(audit.counts.violations, 0, 'CMS overview accessibility audit');
  assert.deepEqual(browser('errors').errors, [], 'no browser runtime errors');
  process.stdout.write('PASS CMS overview axe accessibility and browser runtime errors\n');
} finally {
  try {
    for (const [collection, ids] of Object.entries(created)) {
      for (const id of ids)
        assert.equal(
          api(`/admin/cms/${collection}/${id}`, 'DELETE').status,
          200,
          `cleanup ${collection}`,
        );
    }
    if (featuredBackup) {
      const current = api('/admin/cms/sections').data.items.find(
        (item) => item.id === featuredBackup.id,
      );
      const restored = api(`/admin/cms/sections/${current.id}`, 'PATCH', {
        document: featuredBackup.draft,
        expectedVersion: current.version,
      });
      assert.equal(restored.status, 200, 'restore original featured draft');
      if (featuredBackup.status === 'PUBLISHED') {
        assert.equal(
          api(`/admin/cms/sections/${current.id}/publish`, 'POST', {
            expectedVersion: restored.data.item.version,
          }).status,
          200,
          'restore featured publication status',
        );
      } else if (featuredBackup.status === 'UNPUBLISHED') {
        assert.equal(
          api(`/admin/cms/sections/${current.id}/unpublish`, 'POST', {
            expectedVersion: restored.data.item.version,
          }).status,
          200,
          'restore featured unpublished status',
        );
      }
    }
    if (settingsBackup) {
      const current = api('/admin/cms/settings').data.items.find(
        (item) => item.id === settingsBackup.id,
      );
      const draft = settingsBackup.published ?? settingsBackup.draft;
      const restored = api(`/admin/cms/settings/${current.id}`, 'PATCH', {
        document: draft,
        expectedVersion: current.version,
      });
      assert.equal(restored.status, 200, 'restore original website settings');
      const action = settingsBackup.published ? 'publish' : 'unpublish';
      const restoredPublication = api(`/admin/cms/settings/${current.id}/${action}`, 'POST', {
        expectedVersion: restored.data.item.version,
      });
      assert.equal(restoredPublication.status, 200);
      if (settingsBackup.status === 'DRAFT')
        assert.equal(
          api(`/admin/cms/settings/${current.id}`, 'PATCH', {
            document: settingsBackup.draft,
            expectedVersion: restoredPublication.data.item.version,
          }).status,
          200,
        );
      const final = api('/admin/cms/settings').data.items.find((item) => item.id === current.id);
      assert.deepEqual(
        normalizedSettings(final.draft),
        normalizedSettings(settingsBackup.draft),
        'settings draft restored semantically',
      );
      assert.deepEqual(
        normalizedSettings(final.published),
        normalizedSettings(settingsBackup.published),
        'settings public snapshot restored semantically',
      );
      assert.equal(final.status, settingsBackup.status);
    }
    if (uploadedKey) {
      assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
      const code = `import {prisma} from './src/lib/prisma';import {removePublicObject} from './src/lib/storage';(async()=>{const key=${JSON.stringify(uploadedKey)};await removePublicObject(key);await prisma.mediaAsset.deleteMany({where:{key}});await prisma.$disconnect();})()`;
      execFileSync('pnpm', ['--filter', '@gofest/api', 'exec', 'tsx', '-e', code], {
        encoding: 'utf8',
        timeout: 15000,
      });
    }
  } finally {
    browser('close');
  }
}

for (const [email, destination, allowed] of [
  ['admin@gofest.com', '/admin/dashboard', true],
  ['organizer@gofest.com', '/creator/dashboard', false],
]) {
  try {
    login(email, destination);
    open('/admin/featured-events');
    assert.equal(
      evaluate('document.querySelector("main h1").textContent.includes("bukan untuk")'),
      !allowed,
    );
    assert.equal(api('/admin/cms/sections').status, allowed ? 200 : 403);
    assert.equal(api('/admin/cms/settings').status, 403);
    open('/admin/cms/settings');
    assert.ok(
      evaluate('document.querySelector("main h1").textContent').includes(
        allowed ? 'tidak tersedia' : 'bukan untuk',
      ),
    );
    assert.equal(evaluate('Boolean(document.querySelector("input[type=color]"))'), false);
    process.stdout.write(`PASS ${email} CMS/featured role boundaries
`);
  } finally {
    browser('close');
  }
}
process.stdout.write(
  'CMS BROWSER QA PASS; test content/media removed and website configuration restored.\n',
);
