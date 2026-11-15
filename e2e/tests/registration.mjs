import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-registration-${process.pid}`;
const email = `qa-registration-${Date.now()}@example.com`;
const username = `qa_${Date.now()}`;
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
function fixture(action) {
  return execFileSync(
    'pnpm',
    ['--dir', 'apps/api', 'exec', 'tsx', 'tests/registration-fixture.ts', action, email],
    { encoding: 'utf8' },
  ).trim();
}
function layout(step) {
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [768, 900],
    [1024, 900],
    [1440, 900],
  ]) {
    browser('set', 'viewport', String(width), String(height));
    const bounds = evaluate(`({
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      scroll: document.documentElement.scrollHeight > innerHeight + 1,
      step: document.querySelector('li[aria-current="step"]')?.textContent,
      mascot: document.querySelector('.auth-mascot-image')?.naturalWidth > 0,
      focusVisible: document.activeElement?.matches('input')
    })`);
    assert.equal(bounds.overflow, false, `${step}: horizontal overflow at ${width}`);
    assert.equal(
      bounds.scroll,
      false,
      `${step}: unnecessary vertical scroll at ${width}x${height}`,
    );
    assert.equal(bounds.step, step);
    assert.equal(bounds.mascot, true);
    if ([390, 1440].includes(width))
      assert.equal(browser('a11y').counts.violations, 0, `${step}: accessibility at ${width}`);
  }
  browser('set', 'viewport', '390', '844');
}
try {
  browser('open', new URL('/register', base).href);
  browser('wait', '#register-email');
  browser('wait', '--fn', 'document.querySelector(".auth-mascot-image")?.naturalWidth > 0');
  layout('Email');
  assert.equal(evaluate('!!document.querySelector("#register-password")'), false);
  click('Kirim kode OTP');
  browser('wait', '#register-email-error');
  browser('fill', '#register-email', email);
  click('Kirim kode OTP');
  browser('wait', '#register-code');
  layout('OTP');
  const { code, user } = JSON.parse(fixture('read'));
  assert.equal(user, null, 'OTP request does not create an account');
  assert.equal(
    evaluate(
      '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Kirim ulang")).disabled',
    ),
    true,
  );
  browser('fill', '#register-code', code === '000000' ? '111111' : '000000');
  click('Verifikasi email');
  browser('wait', '[role="alert"]');
  assert.equal(
    evaluate('!!document.querySelector("#register-username")'),
    false,
    'Wrong code cannot advance',
  );
  browser('fill', '#register-code', code);
  click('Verifikasi email');
  browser('wait', '#register-username');
  layout('Profil');
  click('Lanjutkan');
  browser('wait', '#register-username-error');
  browser('fill', '#register-username', username);
  browser('fill', '#register-phone', '081234567890');
  click('Lanjutkan');
  browser('wait', '#register-password');
  layout('Password');
  click('Sebelumnya');
  browser('wait', '#register-username');
  assert.equal(evaluate('document.querySelector("#register-username").value'), username);
  click('Lanjutkan');
  browser('wait', '#register-password');
  click('Buat akun');
  browser('wait', '#register-terms-error');
  browser('fill', '#register-password', 'QaSignup123!');
  click('Tampilkan password');
  assert.equal(evaluate('document.querySelector("#register-password").type'), 'text');
  click('Sembunyikan password');
  browser('check', 'input[type="checkbox"]');
  click('Buat akun');
  browser('wait', '--url', '**/account');
  browser('wait', 'main h1');
  const completed = JSON.parse(fixture('read'));
  assert.equal(completed.user.username, username);
  assert.ok(completed.user.emailVerifiedAt);
  browser('reload');
  browser('wait', 'main h1');
  assert.equal(evaluate('location.pathname'), '/account');
  assert.deepEqual(browser('errors').errors, []);
  process.stdout.write(
    'PASS email → real OTP → unique username/phone → password → authenticated account; wrong OTP blocked, back navigation, validation, accessibility and no normal-state scroll across five viewports.\n',
  );
} finally {
  browser('close');
  fixture('cleanup');
}
