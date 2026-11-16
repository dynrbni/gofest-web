import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-auth-transitions-${process.pid}`;
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
const wait = (code) => browser('wait', '--fn', code);
function settle() {
  wait(
    '!!document.querySelector("#auth-heading") && !document.querySelector("[data-route-loading], [data-page-loading], [data-image-loading]")',
  );
  evaluate(
    'document.getAnimations().filter(a=>a.effect?.getComputedTiming().iterations!==Infinity).forEach(a=>a.finish())',
  );
}
function startAudit() {
  evaluate(`(() => {
    window.__authMain = document.querySelector('main');
    window.__authSlot = document.querySelector('.auth-form-slot');
    window.__authAudit = { frames: [], loading: false, started: performance.now(), stopped: false };
    const loading = '[data-route-loading], [data-page-loading], [data-image-loading]';
    window.__authObserver = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element && (node.matches(loading) || node.querySelector(loading))) window.__authAudit.loading = true;
      }
    });
    window.__authObserver.observe(document.body, { childList: true, subtree: true });
    const sample = () => {
      const audit = window.__authAudit;
      if (audit.stopped) return;
      audit.loading ||= !!document.querySelector(loading);
      audit.frames.push({ path: location.pathname,
        left: document.querySelector('.auth-form-slot')?.getBoundingClientRect().left,
        headings: document.querySelectorAll('main h1').length,
        forms: document.querySelectorAll('main form').length,
        overflow: document.documentElement.scrollWidth > innerWidth + 1 });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })()`);
}
function endAudit(path) {
  wait(
    `location.pathname === ${JSON.stringify(path)} && performance.now() - window.__authAudit.started > 750`,
  );
  const audit = evaluate(`(() => {
    window.__authAudit.stopped = true;
    window.__authObserver.disconnect();
    return { ...window.__authAudit,
      sameMain: window.__authMain === document.querySelector('main'),
      sameSlot: window.__authSlot === document.querySelector('.auth-form-slot') };
  })()`);
  assert.equal(audit.loading, false, 'Switching forms never inserts a skeleton');
  assert.equal(audit.sameMain && audit.sameSlot, true, 'The shared layout persists');
  assert.ok(audit.frames.length > 4, 'Observe actual frames during the switch');
  assert.ok(audit.frames.every((frame) => frame.headings === 1 && frame.forms === 1));
  assert.ok(
    audit.frames.every((frame) => !frame.overflow),
    'The animation never overflows the page',
  );
  assert.ok(
    new Set(audit.frames.map((frame) => Math.round(frame.left))).size <= 2,
    'Form switches directly to its column without travelling across the page',
  );
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".auth-form-slot")).transform'),
    'none',
  );
}
function layout(view, width, height) {
  const bounds = evaluate(`(() => {
    const form = document.querySelector('.auth-form-slot').getBoundingClientRect();
    const mascot = document.querySelector('.auth-mascot').getBoundingClientRect();
    const image = document.querySelector('.auth-mascot-image[data-active=true]');
    return { formLeft: form.left, formRight: form.right,
      mascotLeft: mascot.left, mascotRight: mascot.right, mascotVisible: mascot.width > 0,
      image: image.getAttribute('src'), h1: document.querySelectorAll('main h1').length,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      scroll: document.documentElement.scrollHeight > innerHeight + 1,
      panel: getComputedStyle(document.querySelector('.auth-form-panel')).backgroundColor };
  })()`);
  assert.equal(bounds.pageOverflow, false, `${view} fits ${width}px`);
  assert.equal(bounds.h1, 1);
  assert.equal(bounds.scroll, false, `${view} fits ${width} × ${height}`);
  assert.equal(bounds.panel, 'rgba(0, 0, 0, 0)', 'The form remains on the white canvas');
  assert.ok(bounds.image.endsWith(`gofest-mascot-${view}.png`), 'Each form uses its own pose');
  if (width >= 768) {
    assert.equal(bounds.mascotVisible, true);
    assert.ok(
      view === 'login'
        ? bounds.formLeft > bounds.mascotRight
        : bounds.formRight < bounds.mascotLeft,
    );
  } else assert.equal(bounds.mascotVisible, false, 'Small screens prioritize the form');
  assert.equal(browser('a11y').counts.violations, 0);
}

try {
  for (const [width, height] of [
    [1440, 900],
    [1024, 900],
    [768, 900],
    [390, 844],
    [320, 640],
  ]) {
    browser('set', 'viewport', String(width), String(height));
    browser('open', `${base}/login`);
    browser('wait', '#login-email');
    wait(
      '[...document.querySelectorAll(".auth-mascot-image")].every(image => image.complete && image.naturalWidth > 0)',
    );
    settle();
    layout('login', width, height);
    startAudit();
    browser('click', '.auth-switch a');
    browser('wait', '#register-name');
    endAudit('/register');
    layout('register', width, height);
    startAudit();
    browser('click', '.auth-switch a');
    browser('wait', '#login-email');
    endAudit('/login');
    layout('login', width, height);
    process.stdout.write(
      `PASS instant column switch, distinct poses, no skeleton, accessibility at ${width}px\n`,
    );
  }
  browser('set', 'viewport', '1440', '900');
  startAudit();
  browser('back');
  browser('wait', '#register-name');
  endAudit('/register');
  layout('register', 1440, 900);
  browser('set', 'media', 'light', 'reduced-motion');
  startAudit();
  browser('click', '.auth-switch a');
  browser('wait', '#login-email');
  endAudit('/login');
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".auth-form-slot")).transitionDuration'),
    '0s',
  );
  assert.equal(
    evaluate('getComputedStyle(document.querySelector(".auth-form-content")).animationName'),
    'none',
  );
  layout('login', 1440, 900);
  browser('find', 'role', 'button', 'click', '--name', 'Masuk', '--exact');
  browser('wait', '#login-email-error');
  browser('fill', '#login-password', 'Example123!');
  browser('find', 'role', 'button', 'click', '--name', 'Tampilkan password', '--exact');
  assert.equal(evaluate('document.querySelector("#login-password").type'), 'text');
  assert.deepEqual(browser('errors').errors, []);
  process.stdout.write(
    'PASS Back navigation, reduced motion, login validation and password visibility\n',
  );
} finally {
  browser('close');
}
