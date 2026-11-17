import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const base = new URL(process.env.QA_BASE_URL ?? 'http://localhost:5173');
assert.ok(
  ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname),
  'CMS mutation QA requires a local development URL',
);
const session = `gofest-cms-cities-${process.pid}`;
const marker = `Kota QA ${Date.now()} ${process.pid}`;
const screenshots = process.env.QA_SCREENSHOTS ?? '/tmp/gofest-cms-ux-qa';
const fixtures = mkdtempSync(path.join(tmpdir(), 'gofest-city-'));
const require = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const sharp = require('sharp');
mkdirSync(screenshots, { recursive: true });
let cityId;
let authenticated = false;
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message ?? args[0]);
  return result.data;
}
const evaluate = (source) => browser('eval', source).result;
const wait = (source) => browser('wait', '--fn', source);
const button = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const fill = (name, value) =>
  browser('find', 'role', 'textbox', 'fill', '--name', name, '--exact', value);
const saved = () =>
  wait(
    '!document.body.textContent.includes("Menyimpan perubahan...") && !document.body.textContent.includes("Mengunggah gambar")',
  );
function open(route, text) {
  browser('open', new URL(route, base).href);
  browser('wait', '--text', text);
}
function request(route, method = 'GET', body) {
  const result = evaluate(
    `fetch(${JSON.stringify(`/api/v1${route}`)},${JSON.stringify({ method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })}).then(async response=>({status:response.status,envelope:await response.json()}))`,
  );
  assert.ok(
    result.status >= 200 && result.status < 300,
    `${method} ${route}: ${JSON.stringify(result.envelope.error)}`,
  );
  return result.envelope.data;
}
function ownCity() {
  return request('/admin/cms/cities').items.find(
    (row) => row.id === cityId || row.draft.name.startsWith(marker),
  );
}
function publish() {
  const city = ownCity();
  request(`/admin/cms/cities/${city.id}/publish`, 'POST', { expectedVersion: city.version });
}
function upload(label, file) {
  const snapshot = browser('snapshot', '-i');
  const tree =
    typeof snapshot === 'string' ? snapshot : (snapshot.snapshot ?? snapshot.tree ?? snapshot.text);
  assert.equal(typeof tree, 'string', 'Snapshot includes an accessibility tree');
  const line = tree.split('\n').find((line) => line.includes(`button "${label}"`));
  const ref = line?.match(/\[ref=(e\d+)\]/)?.[1];
  assert.ok(ref, `Upload input reference for ${label}`);
  browser('upload', `@${ref}`, file);
}
function publicCard() {
  return evaluate(
    `(()=>{const card=[...document.querySelectorAll('.city-destination')].find(card=>card.textContent.includes(${JSON.stringify(marker)}));return card?{href:card.getAttribute('href'),image:card.querySelector('img')?.getAttribute('src')??null,plain:!!card.querySelector('.city-location-placeholder')}:null})()`,
  );
}
try {
  await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 4,
      background: { r: 0, g: 82, b: 204, alpha: 0.2 },
    },
  })
    .png()
    .toFile(path.join(fixtures, 'city.png'));
  await sharp({
    create: {
      width: 500,
      height: 500,
      channels: 4,
      background: { r: 0, g: 82, b: 204, alpha: 0.2 },
    },
  })
    .png()
    .toFile(path.join(fixtures, 'small.png'));
  browser('set', 'viewport', '1440', '1000');
  open('/login', 'Selamat datang kembali!');
  fill('Email *', process.env.QA_SUPERADMIN_EMAIL ?? 'superadmin@gofest.com');
  fill('Password *', process.env.QA_PASSWORD ?? 'admin123');
  button('Masuk');
  browser('wait', '--url', '**/admin/**');
  authenticated = true;
  open('/admin/cms/cities', 'Daftar kota');
  fill('Nama kota *', marker);
  button('Warna hijau');
  assert.equal(
    evaluate(`document.querySelector('[aria-label="Warna hijau"]').getAttribute('aria-pressed')`),
    'true',
  );
  button('Tambah kota');
  browser('wait', '--text', `Ubah ${marker}`);
  cityId = ownCity().id;
  assert.equal(ownCity().draft.imageKey, '', 'City can be created without illustration');
  assert.equal(
    request('/cms/site').cities.some((city) => city.id === cityId),
    false,
    'Draft city stays private',
  );
  fill('Nama kota *', `${marker} Baru`);
  saved();
  assert.equal(ownCity().draft.name, `${marker} Baru`);
  publish();
  open('/cities', `${marker} Baru`);
  assert.equal(publicCard().plain, true, 'Published city without artwork shows location icon');
  assert.equal(publicCard().href, `/events?city=${ownCity().draft.slug}`);
  open('/admin/cms/cities', `${marker} Baru`);
  button(`Ubah ${marker} Baru`);
  upload('Ilustrasi kota (opsional)', path.join(fixtures, 'small.png'));
  browser('wait', '--text', 'Ilustrasi kota harus persegi, minimal 600 × 600 px');
  upload('Ilustrasi kota (opsional)', path.join(fixtures, 'city.png'));
  saved();
  assert.ok(ownCity().draft.imageKey.startsWith('cms-cities/'));
  assert.equal(ownCity().published.imageKey, '', 'Uploaded draft does not change published image');
  browser('reload');
  browser('wait', '--text', `${marker} Baru`);
  button(`Ubah ${marker} Baru`);
  wait(
    `document.querySelector('img[alt="Pratinjau ilustrasi kota (opsional)"]')?.naturalWidth > 0`,
  );
  browser('screenshot', path.join(screenshots, 'cities-persisted-editor.png'));
  publish();
  open('/cities', `${marker} Baru`);
  assert.ok(publicCard().image?.includes('/uploads/cms-cities/'));
  for (const width of [1440, 768, 390]) {
    browser('set', 'viewport', String(width), '1000');
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Public city cards fit ${width}px`,
    );
  }
  open('/admin/cms/cities', 'Daftar kota');
  assert.equal(
    evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
    false,
    'Mobile city editor fits',
  );
  assert.equal(evaluate('document.querySelectorAll("h1").length'), 1);
  fill('Nama kota *', 'Uji dibatalkan');
  button('Batal');
  assert.equal(evaluate('document.getElementById("cms-city-name").value'), '');
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write(
    'PASS CMS city explicit create/cancel, optional art, autosave/reload, upload validation/persistence, draft isolation, scoped publishing, public image/plain card, links and responsive editor.\n',
  );
} finally {
  if (authenticated) {
    try {
      const city = ownCity();
      if (city && city.draft.name.startsWith(marker)) {
        if (city.published)
          request(`/admin/cms/cities/${city.id}/unpublish`, 'POST', {
            expectedVersion: city.version,
          });
        request(`/admin/cms/cities/${city.id}`, 'DELETE');
        assert.equal(ownCity(), undefined, 'Temporary city removed');
      }
    } catch (error) {
      process.exitCode = 1;
      process.stderr.write(`Temporary city cleanup failed: ${error.message}\n`);
    }
  }
  rmSync(fixtures, { recursive: true, force: true });
  browser('close');
}
