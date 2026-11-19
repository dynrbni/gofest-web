import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = process.env.QA_SESSION ?? `gofest-workspace-navigation-${process.pid}`;
function browser(...args) {
  const response = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(response.success, true, response.error?.message ?? args.join(' '));
  return response.data;
}
function evaluate(source) {
  return browser('eval', source).result;
}
function ready() {
  browser(
    'wait',
    '--fn',
    'Boolean(document.querySelector("main h1")) && !document.querySelector("main [aria-busy=true]")',
  );
}
try {
  for (const [email, workspace] of [
    ['superadmin@gofest.com', 'admin'],
    ['admin@gofest.com', 'admin'],
    ['organizer@gofest.com', 'creator'],
  ]) {
    browser('open', `${base}/login`);
    browser(
      'wait',
      '--fn',
      'Boolean(document.querySelector("#login-email")) && !document.querySelector("[inert]")',
    );
    browser('find', 'label', 'Email', 'fill', email);
    browser('find', 'label', 'Password', 'fill', process.env.QA_PASSWORD ?? 'admin123');
    evaluate('document.querySelector("form").requestSubmit()');
    browser('wait', '--url', `**/${workspace}/dashboard`);
    ready();
    browser('set', 'viewport', '1440', '800');
    evaluate(
      'window.__workspaceAside=document.querySelector("aside"); window.__workspaceHeader=document.querySelector("header"); window.__workspaceScroller=document.querySelector("[data-workspace-sidebar-scroll]"); document.querySelector("aside nav button").click(); window.__workspaceGroup=document.querySelector("aside nav button"); true;',
    );
    evaluate(
      'window.__workspaceScroller.scrollTop=180; window.__workspaceScroll=window.__workspaceScroller.scrollTop; true;',
    );
    evaluate(`document.querySelector('aside a[href="/${workspace}/payouts"]').click()`);
    browser('wait', '--url', `**/${workspace}/payouts`);
    ready();
    const state = evaluate(
      '({aside:window.__workspaceAside===document.querySelector("aside"),header:window.__workspaceHeader===document.querySelector("header"),scroller:window.__workspaceScroller===document.querySelector("[data-workspace-sidebar-scroll]"), scroll:window.__workspaceScroller.scrollTop, previous:window.__workspaceScroll,group:window.__workspaceGroup.getAttribute("aria-expanded"),overlay:Boolean(document.querySelector("[data-route-loading]")),logo:document.querySelector("aside img")?.getAttribute("src")})',
    );
    assert.equal(state.aside, true, `${email}: sidebar stays mounted`);
    assert.equal(state.header, true, `${email}: topbar stays mounted`);
    assert.equal(state.scroller, true, `${email}: scroller stays mounted`);
    assert.equal(state.scroll, state.previous, `${email}: sidebar scroll retained`);
    assert.equal(state.group, 'false', `${email}: collapsed group retained`);
    assert.equal(state.overlay, false, `${email}: no full-dashboard loading overlay`);
    assert.ok(state.logo?.includes(`gofest-${workspace}-logo`), `${email}: role-specific logo`);
    evaluate('document.querySelector("aside button[aria-label]").click()');
    evaluate(`document.querySelector('aside a[href="/${workspace}/account/settings"]').click()`);
    browser('wait', '--url', `**/${workspace}/account/settings`);
    ready();
    assert.equal(
      evaluate(
        'document.querySelector("aside button[aria-expanded]").getAttribute("aria-expanded")',
      ),
      'false',
      `${email}: narrow sidebar retained`,
    );
    assert.ok(
      evaluate('window.__workspaceAside === document.querySelector("aside")'),
      `${email}: account settings remain inside the workspace`,
    );
    assert.equal(
      evaluate(`Boolean(document.querySelector('main a[href="/account/orders"]'))`),
      false,
      `${email}: workspace settings keep workspace navigation`,
    );
    const inbox = evaluate(
      `fetch('/api/v1/${workspace}/notifications?limit=1').then(r=>r.json()).then(b=>b.data)`,
    );
    assert.equal(
      evaluate(
        'document.querySelector("header a[href$=notifications]").getAttribute("aria-label")',
      ),
      `Notifikasi${inbox.unread ? `, ${inbox.unread} belum dibaca` : ''}`,
      `${email}: bell count matches backend`,
    );
    browser('set', 'viewport', '390', '844');
    assert.equal(
      evaluate('document.documentElement.scrollWidth>innerWidth+1'),
      false,
      `${email}: mobile has no horizontal overflow`,
    );
    evaluate(
      '[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Keluar")).click()',
    );
    browser('wait', '--url', '**/login');
    browser('close');
    process.stdout.write(
      `PASS ${email}: persistent sidebar, topbar, scroll, groups, collapse, role logo, inbox count, mobile\n`,
    );
  }
} finally {
  browser('close');
}
