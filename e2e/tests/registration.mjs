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
    const bounds = evaluate(
      `({overflow:document.documentElement.scrollWidth>innerWidth+1,scroll:document.documentElement.scrollHeight>innerHeight+1,step:document.querySelector('li[aria-current="step"]')?.textContent,mascot:document.querySelector('.auth-mascot-image')?.getBoundingClientRect().width>0,logo:!!document.querySelector('.auth-form-header img[src="/assets/gofest-logo.png"]'),language:!!document.querySelector('.auth-form-header button')})`,
    );
    assert.equal(bounds.overflow, false, `${step}: horizontal overflow at ${width}`);
    assert.equal(bounds.scroll, false, `${step}: vertical scroll at ${width}x${height}`);
    assert.ok(bounds.step.includes(step));
    if (width >= 768) assert.equal(bounds.mascot, true, 'Desktop keeps mascot at left');
    assert.equal(bounds.logo, true);
    assert.equal(bounds.language, true);
    if ([390, 1440].includes(width))
      assert.equal(browser('a11y').counts.violations, 0, `${step}: accessibility`);
  }
  browser('set', 'viewport', '390', '844');
}
try {
  browser('open', new URL('/register', base).href);
  browser('wait', '#register-name');
  browser('wait', '--fn', 'document.querySelector(".auth-mascot-image")?.naturalWidth>0');
  layout('Data diri');
  assert.equal(evaluate('!!document.querySelector("#register-password")'), false);
  click('Lanjutkan');
  browser('wait', '#register-email-error');
  browser('fill', '#register-name', 'Nadia Pengguna');
  browser('fill', '#register-username', username);
  browser('fill', '#register-phone', '081234567890');
  browser('fill', '#register-email', email);
  click('Pilih bahasa');
  browser('find', 'role', 'menuitem', 'click', '--name', 'English', '--exact');
  browser('wait', '--fn', '!document.querySelector("[role=menu]")');
  browser('wait', '--fn', 'document.documentElement.lang==="en"');
  assert.equal(evaluate('document.querySelector("#register-name").value'), 'Nadia Pengguna');
  assert.equal(
    evaluate('document.querySelector("#auth-heading").textContent'),
    'Create your Gofest account',
  );
  click('Choose language');
  browser('find', 'role', 'menuitem', 'click', '--name', 'Bahasa Indonesia', '--exact');
  browser('wait', '--fn', '!document.querySelector("[role=menu]")');
  click('Lanjutkan');
  browser('wait', '#register-password');
  layout('Password');
  click('Lanjutkan');
  browser('wait', '#register-terms-error');
  browser('fill', '#register-password', 'weak');
  browser('check', 'input[type="checkbox"]');
  click('Lanjutkan');
  browser('wait', '#register-password-error');
  assert.equal(
    evaluate('!!document.querySelector("#register-code")'),
    false,
    'Weak password cannot advance to verification',
  );
  assert.equal(
    evaluate('document.querySelector("[role=meter]").getAttribute("aria-valuetext")'),
    'Lemah',
  );
  browser('fill', '#register-password', 'QaSignup123!Long');
  assert.equal(
    evaluate('document.querySelector("[role=meter]").getAttribute("aria-valuetext")'),
    'Kuat',
  );
  click('Tampilkan password');
  assert.equal(evaluate('document.querySelector("#register-password").type'), 'text');
  click('Sembunyikan password');
  click('Sebelumnya');
  browser('wait', '#register-name');
  assert.equal(evaluate('document.querySelector("#register-name").value'), 'Nadia Pengguna');
  assert.equal(evaluate('document.querySelector("#register-username").value'), username);
  click('Lanjutkan');
  browser('wait', '#register-password');
  assert.equal(evaluate('document.querySelector("#register-password").value'), 'QaSignup123!Long');
  browser('check', 'input[type="checkbox"]');
  click('Lanjutkan');
  browser('wait', '#register-code');
  layout('Verifikasi');
  const queued = JSON.parse(fixture('read'));
  assert.equal(queued.user, null, 'No account exists before the final OTP step');
  assert.equal(
    evaluate(
      '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Kirim ulang")).disabled',
    ),
    true,
  );
  browser('fill', '#register-code', '12');
  click('Verifikasi email');
  browser('wait', '#register-code-error');
  const arbitrary = queued.code === '123456' ? '654321' : '123456';
  if (queued.testMode) {
    assert.ok(evaluate('document.body.textContent.includes("Mode testing")'));
    browser('fill', '#register-code', arbitrary);
  } else {
    browser('fill', '#register-code', arbitrary);
    click('Verifikasi email');
    browser('wait', '[role="alert"]');
    assert.equal(
      evaluate('location.pathname'),
      '/register',
      'Real OTP mode rejects arbitrary codes',
    );
    browser('fill', '#register-code', queued.code);
  }
  click('Verifikasi email');
  browser('wait', '--url', '**/account');
  browser('wait', 'main h1');
  const completed = JSON.parse(fixture('read'));
  assert.equal(completed.user.username, username);
  assert.equal(completed.user.name, 'Nadia Pengguna');
  assert.ok(completed.user.emailVerifiedAt);
  browser('reload');
  browser('wait', 'main h1');
  assert.equal(evaluate('location.pathname'), '/account');
  browser('open', new URL('/login', base).href);
  browser('wait', '#login-email');
  click('Pilih bahasa');
  browser('find', 'role', 'menuitem', 'click', '--name', 'English', '--exact');
  browser('wait', '--fn', '!document.querySelector("[role=menu]")');
  browser('wait', '--fn', 'document.querySelector("#auth-heading").textContent==="Welcome back!"');
  assert.equal(browser('a11y').counts.violations, 0, 'Login header accessibility');
  assert.deepEqual(browser('errors').errors, []);
  process.stdout.write(
    `PASS personal information → strong password → final OTP → authenticated account; ${queued.testMode ? 'arbitrary testing OTP accepted' : 'real OTP enforced'}, language switch, strength states, visibility, validation, back navigation, persistence, accessibility and fifteen responsive step checks.\n`,
  );
} finally {
  browser('close');
  fixture('cleanup');
}
