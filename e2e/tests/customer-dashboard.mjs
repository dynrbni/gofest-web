import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-customer-${process.pid}`;
const email = `qa-customer-${Date.now()}@example.com`;
const outputDir = '/tmp/gofest-customer-qa';
mkdirSync(outputDir, { recursive: true });
function fixture(action) {
  return execFileSync(
    'pnpm',
    ['--dir', 'apps/api', 'exec', 'tsx', 'tests/customer-dashboard-fixture.ts', action, email],
    { encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
  );
}
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 6 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message ?? result.error ?? args[0]);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const button = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const fill = (label, value) => browser('find', 'label', label, 'fill', value);
function select(label, value) {
  const refs = browser('snapshot', '-i').refs;
  const item = Object.entries(refs).find(
    ([, ref]) => ref.role === 'combobox' && ref.name === label,
  );
  assert.ok(item, `Combobox ${label} exists`);
  browser('select', `@${item[0]}`, value);
}
function open(path) {
  browser('open', new URL(path, base).href);
  wait(
    '!!document.querySelector("#account-main h1") && !document.querySelector("[data-route-loading]")',
  );
  wait('!document.querySelector("#account-main [aria-busy=true]")');
}
function checkLayout(label) {
  assert.equal(
    evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
    false,
    `${label}: horizontal overflow`,
  );
  assert.equal(
    evaluate('document.querySelectorAll("main h1").length'),
    1,
    `${label}: one page heading`,
  );
  const audit = browser('a11y');
  assert.equal(
    audit.counts.violations,
    0,
    `${label}: accessibility ${JSON.stringify(audit.violations)}`,
  );
}

let data;
try {
  data = JSON.parse(
    fixture('setup')
      .split('\n')
      .find((line) => line.startsWith('FIXTURE:'))
      .slice(8),
  );
  browser('set', 'viewport', '1440', '1000');
  browser('open', new URL('/login?next=/account', base).href);
  browser('wait', '#login-email');
  fill('Email', data.email);
  fill('Password', data.password);
  button('Masuk');
  wait('location.pathname === "/account" && !document.querySelector("[data-route-loading]")');
  wait('document.querySelectorAll(".account-stat strong").length === 3');
  assert.deepEqual(
    evaluate('[...document.querySelectorAll(".account-stat strong")].map(el=>el.textContent)'),
    ['3', '1', '3'],
  );
  assert.equal(evaluate('document.querySelector("h1").textContent.includes("Pengguna")'), true);
  assert.equal(
    evaluate('document.querySelector(".account-next-info h3").textContent'),
    data.eventTitle,
  );
  assert.equal(
    evaluate(
      'getComputedStyle(document.querySelector(".customer-account")).fontFamily.includes("Poppins")',
    ),
    true,
  );
  browser('screenshot', `${outputDir}/overview-desktop.png`, '--full');

  const paths = [
    '/account',
    '/account/tickets',
    '/account/orders',
    `/account/orders/${data.orderId}`,
    `/account/tickets/${data.ticketCode}`,
    '/account/favorites',
    '/account/profile',
    '/account/settings',
  ];
  let checks = 0;
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    for (const path of paths) {
      open(path);
      if (path.endsWith(data.ticketCode))
        wait('document.querySelector(".account-qr img")?.naturalWidth > 0');
      checkLayout(`${path} @ ${width}`);
      checks += 1;
    }
    assert.equal(
      evaluate(
        'getComputedStyle(document.querySelector(".account-bottom-nav")).display !== "none"',
      ),
      width < 1024,
    );
  }

  browser('set', 'viewport', '390', '844');
  open('/account/tickets');
  assert.equal(evaluate('document.querySelectorAll(".account-wallet-card").length'), 1);
  browser('screenshot', `${outputDir}/wallet-mobile.png`, '--full');
  fill('Nama event', 'Tidak ada nama ini');
  button('Terapkan');
  wait('document.querySelector("#account-main").textContent.includes("Belum ada tiket di sini")');
  assert.equal(evaluate('new URLSearchParams(location.search).get("q")'), 'Tidak ada nama ini');
  button('Reset');
  wait('document.querySelectorAll(".account-wallet-card").length === 1');
  evaluate(`(() => {
    const input = document.querySelector('input[name="dateFrom"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2099-01-01');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  button('Terapkan');
  wait('document.querySelector("main").textContent.includes("Belum ada tiket di sini")');
  assert.equal(evaluate('new URLSearchParams(location.search).get("dateFrom")'), '2099-01-01');
  button('Reset');
  wait('document.querySelectorAll(".account-wallet-card").length === 1');
  browser('find', 'role', 'link', 'click', '--name', 'Selesai', '--exact');
  wait('document.querySelector(".account-wallet-card")?.textContent.includes("Sudah check-in")');
  browser('find', 'role', 'link', 'click', '--name', 'Tidak berlaku', '--exact');
  wait('document.querySelector(".account-wallet-card")?.textContent.includes("Dana dikembalikan")');
  browser('back');
  wait('new URLSearchParams(location.search).get("period") === "past"');

  open(`/account/tickets/${data.usedCode}`);
  assert.equal(evaluate('document.querySelectorAll(".account-qr img").length'), 0);
  assert.equal(
    evaluate(
      'document.querySelector("main").textContent.includes("tidak dapat digunakan kembali")',
    ),
    true,
  );
  open(`/account/tickets/${data.ticketCode}`);
  wait('document.querySelector(".account-qr img")?.naturalWidth > 0');
  evaluate('window.__printed = 0; window.print = () => { window.__printed += 1; }');
  button('Cetak tiket');
  assert.equal(evaluate('window.__printed'), 1);
  button('Buat ulang QR');
  browser('wait', '[role=alertdialog]');
  wait(
    'document.getAnimations().filter(a => a.effect?.target?.closest?.("[role=alertdialog]")).every(a => a.playState === "finished")',
  );
  const dialogAudit = browser('a11y');
  assert.equal(
    dialogAudit.counts.violations,
    0,
    `QR regeneration confirmation accessibility: ${JSON.stringify(dialogAudit.violations)}`,
  );
  browser('find', 'role', 'button', 'click', '--name', 'Buat ulang QR', '--exact');
  wait(
    '!document.querySelector("[role=alertdialog]") && !document.querySelector("main").textContent.includes("Memperbarui…")',
  );
  wait('document.querySelector(".account-qr img")?.naturalWidth > 0');

  open('/account/orders');
  assert.equal(evaluate('document.querySelectorAll(".account-order-row").length'), 3);
  select('Status pembayaran', 'PAID');
  button('Terapkan');
  wait('document.querySelectorAll(".account-order-row").length === 2');
  browser('reload');
  wait('document.querySelectorAll(".account-order-row").length === 2');
  assert.equal(evaluate('document.querySelector("select[name=paymentStatus]").value'), 'PAID');
  button('Reset');
  wait('document.querySelectorAll(".account-order-row").length === 3');
  open(`/account/orders/${data.pendingId}`);
  assert.equal(
    evaluate(`!!document.querySelector('main a[href^="/order/"]')`),
    true,
    'Pending payment uses existing checkout flow',
  );

  open('/account/profile');
  assert.equal(evaluate('document.querySelector("#account-email").disabled'), true);
  fill('Nama lengkap', 'A');
  button('Simpan perubahan');
  browser('wait', '#account-name-error');
  fill('Nama lengkap', 'Pengguna Dashboard Uji');
  fill('Nomor WhatsApp', 'bukan nomor');
  button('Simpan perubahan');
  browser('wait', '#account-phone-error');
  fill('Nomor WhatsApp', '+6281234567890');
  button('Simpan perubahan');
  wait('document.querySelector("main").textContent.includes("Perubahan tersimpan")');
  browser('reload');
  browser('wait', '#account-name');
  assert.equal(evaluate('document.querySelector("#account-name").value'), 'Pengguna Dashboard Uji');
  button('Ubah password');
  browser('wait', '[role=alertdialog]');
  button('Kirim tautan');
  wait('document.querySelector("main").textContent.includes("Permintaan terkirim")');

  open('/account/settings');
  select('Bahasa tampilan', 'en');
  wait('document.querySelector("main h1").textContent === "Settings"');
  browser('reload');
  browser('wait', '#account-language');
  assert.equal(evaluate('document.querySelector("#account-language").value'), 'en');
  select('Display language', 'id');

  browser('set', 'media', 'light', 'reduced-motion');
  open('/account/tickets');
  assert.equal(evaluate('matchMedia("(prefers-reduced-motion: reduce)").matches'), true);
  assert.equal(
    evaluate(
      '[...document.querySelectorAll(".customer-account *")].some(el=>getComputedStyle(el).animationName !== "none")',
    ),
    false,
  );
  browser('focus', 'main input[name=q]');
  assert.equal(evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid');
  assert.equal(browser('errors').errors.length, 0, 'No browser JavaScript errors');

  browser('network', 'route', '**/api/v1/account/history*', '--abort');
  browser('open', new URL('/account/orders', base).href);
  wait(
    '!!document.querySelector("#account-main [role=status][aria-busy=true]") && !document.querySelector("[data-route-loading]")',
  );
  assert.ok(
    evaluate('document.querySelectorAll(\'#account-main [class*="animate-pulse"]\').length') > 0,
    'Account request displays skeletons',
  );
  wait('document.querySelector("main").textContent.includes("Coba Lagi")');
  browser('network', 'unroute');
  button('Coba Lagi');
  wait('document.querySelectorAll(".account-order-row").length === 3');
  open('/account/settings');
  button('Keluar dari akun');
  browser('wait', '[role=alertdialog]');
  button('Keluar');
  wait('location.pathname === "/login"');
  browser('open', new URL('/account/tickets', base).href);
  wait(
    'location.pathname === "/login" && new URLSearchParams(location.search).get("next") === "/account/tickets"',
  );
  process.stdout.write(
    `PASS ${checks} route/viewport/accessibility checks; real ticket/order/profile/reset/language/logout flows, QR regeneration/print, filters, empty/error recovery and reduced motion.\n`,
  );
} finally {
  try {
    fixture('cleanup');
  } finally {
    try {
      browser('close');
    } catch {
      /* The failure may have already closed the browser session. */
    }
  }
}
