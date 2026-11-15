import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-customer-${process.pid}`;
function browser(...args) {
  const result = JSON.parse(
    execFileSync('agent-browser', ['--session', session, '--json', ...args], {
      encoding: 'utf8',
      timeout: 35_000,
      maxBuffer: 4 * 1024 * 1024,
    }),
  );
  assert.equal(result.success, true, result.error?.message ?? result.error);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const date = (id, value) =>
  evaluate(
    `(() => { const input = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
const finish = () =>
  evaluate(
    'document.getAnimations().filter(animation => animation.effect.getComputedTiming().iterations !== Infinity).forEach(animation => animation.finish())',
  );
const fit = (label) =>
  assert.equal(evaluate('document.documentElement.scrollWidth > innerWidth + 1'), false, label);
const accessible = (label) => {
  finish();
  assert.deepEqual(browser('a11y').violations, [], label);
};

const { data: events } = await fetch(`${base}/api/v1/events?limit=12`).then((response) =>
  response.json(),
);
let event, ticket;
for (const item of events) {
  const result = await fetch(`${base}/api/v1/events/${item.slug}`).then((response) =>
    response.json(),
  );
  ticket = result.data.event.ticketTypes.find(
    (entry) =>
      entry.isOnSale && entry.minPerOrder === 1 && entry.maxPerOrder >= 2 && entry.available >= 2,
  );
  if (ticket) {
    event = result.data.event;
    break;
  }
}
assert.ok(event && ticket, 'An available event is required');
try {
  for (const width of process.env.QA_WIDTH
    ? [Number(process.env.QA_WIDTH)]
    : [1440, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '900');
    browser('open', `${base}/checkout/${event.slug}?ticket=${ticket.id}`);
    browser('wait', '#tickets-heading');
    wait('!document.querySelector("aside button").disabled');
    click(`Tambah tiket ${ticket.name}`);
    wait('!document.querySelector("aside button").disabled');
    click('Lanjutkan');
    browser('wait', '#checkout-name');
    assert.equal(evaluate('document.querySelector("h1").textContent'), event.title);
    assert.equal(
      evaluate(
        '[...document.querySelectorAll("section")].filter(section => section.getAttribute("aria-label")?.startsWith("Detail Pesanan")).length',
      ),
      2,
    );
    browser('fill', '#checkout-name', 'Pemesan Internasional');
    browser('fill', '#checkout-email', 'international-checkout@example.com');
    browser('select', '#checkout-identityType', 'PASSPORT');
    browser('fill', '#checkout-identityNumber', 'P1234567');
    click('Negara pemesan: Indonesia +62');
    browser('fill', 'input[aria-label="Cari negara atau kode telepon"]', 'zzzznonexistent');
    wait('document.body.textContent.includes("Negara tidak ditemukan.")');
    browser('fill', 'input[aria-label="Cari negara atau kode telepon"]', 'Singapore');
    accessible(`Country menu at ${width}px`);
    click('Singapura +65');
    wait('!document.querySelector("[role=dialog]")');
    browser('fill', '#checkout-phone', '+6581234567');
    assert.ok(evaluate('document.querySelector("#checkout-phone").value').startsWith('+65'));
    assert.ok(
      evaluate(
        '[...document.querySelectorAll("button")].some(button => button.getAttribute("aria-label") === "Negara pemesan: Singapura +65")',
      ),
    );
    for (let index = 0; index < 2; index += 1) {
      browser('check', `[aria-label="Detail Pesanan – ${index + 1}"] input[type=checkbox]`);
      browser(
        'check',
        `input[name="holder-${index}-gender"][value=${index === 0 ? 'FEMALE' : 'MALE'}]`,
      );
      date(`holder-${index}-birthDate`, index === 0 ? '2015-01-01' : '1995-01-01');
      if (index === 0) {
        assert.equal(
          evaluate('document.querySelector("#holder-0-identityType option[value=KTP]").disabled'),
          true,
        );
        assert.equal(
          evaluate('document.querySelector("#holder-0-identityType option[value=SIM]").disabled'),
          true,
        );
        browser('select', '#holder-0-identityType', 'STUDENT_CARD');
        browser('fill', '#holder-0-identityNumber', 'SISWA-1234');
      }
    }
    browser('fill', '#checkout-name', 'Pemesan Diperbarui');
    assert.equal(
      evaluate('document.querySelector("#holder-1-name").value'),
      'Pemesan Diperbarui',
      'Copied data follows buyer edits',
    );
    assert.equal(
      evaluate('document.querySelector("#holder-0-name").value'),
      'Pemesan Internasional',
      'Individual holder keeps their own data',
    );
    assert.equal(
      evaluate('document.querySelector("#holder-1-birthDate").value'),
      '1995-01-01',
      'Copy does not overwrite birth date',
    );
    browser('fill', '#holder-1-name', 'Pengunjung Kedua');
    browser('check', '[aria-labelledby=terms-heading] input[type=checkbox]');
    wait('!document.querySelector("button[type=submit]").disabled');
    fit(`Customer form fits ${width}px`);
    accessible(`Customer form at ${width}px`);
    click('Lanjut ke Pembayaran');
    browser('wait', '[role=dialog][data-state=open]');
    assert.equal(evaluate('location.pathname'), `/checkout/${event.slug}`);
    assert.ok(
      evaluate('document.querySelector("[role=dialog]").textContent').includes('+6581234567'),
    );
    assert.ok(evaluate('document.querySelector("[role=dialog]").textContent').includes('2 tiket'));
    fit(`Confirmation fits ${width}px`);
    accessible(`Confirmation at ${width}px`);
    for (let tab = 0; tab < 5; tab += 1) {
      browser('press', 'Tab');
      assert.equal(
        evaluate('Boolean(document.activeElement.closest("[role=dialog]"))'),
        true,
        'Confirmation traps keyboard focus',
      );
    }
    browser('press', 'Escape');
    wait('!document.querySelector("[role=dialog]")');
    assert.equal(
      evaluate('document.activeElement.getAttribute("type")'),
      'submit',
      'Escape returns focus to the checkout button',
    );
    assert.equal(
      evaluate('document.querySelector("#holder-0-identityType").value'),
      'STUDENT_CARD',
    );
    click('Lanjut ke Pembayaran');
    browser('wait', '[role=dialog][data-state=open]');
    click('Edit Data');
    wait('!document.querySelector("[role=dialog]")');
    assert.equal(evaluate('document.querySelector("#holder-1-name").value'), 'Pengunjung Kedua');
    process.stdout.write(
      `PASS ${width}px event heading, searchable countries, international phone, individual holders, age policy, copied values and confirmation keyboard/edit flow.\n`,
    );
  }
  assert.deepEqual(browser('errors').errors, []);
} catch (error) {
  process.stderr.write(
    JSON.stringify(
      evaluate(
        '({errors:[...document.querySelectorAll("[id$=error], [role=alert]")].map(node=>node.textContent), submit:document.querySelector("button[type=submit]")?.disabled, modal:document.querySelector("[role=dialog]")?.getAttribute("data-state")})',
      ),
    ) + '\n',
  );
  browser('screenshot', '/tmp/gofest-checkout-customer-failure.png');
  throw error;
} finally {
  browser('close');
}
