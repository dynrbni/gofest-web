import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const base = process.env.QA_BASE_URL ?? 'http://localhost:5173';
const session = `gofest-detail-${process.pid}`;
function browser(...args) {
  const output = execFileSync('agent-browser', ['--session', session, '--json', ...args], {
    encoding: 'utf8',
    timeout: 35_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const result = JSON.parse(output);
  assert.equal(result.success, true, result.error?.message ?? result.error);
  return result.data;
}
const evaluate = (code) => browser('eval', code).result;
const wait = (code) => browser('wait', '--fn', code);
const click = (name) => browser('find', 'role', 'button', 'click', '--name', name, '--exact');
const open = (path) => {
  browser('open', new URL(path, base).href);
  browser('wait', 'main h1');
};
const finishAnimations = () =>
  evaluate(
    'document.getAnimations().forEach(animation => { try { if (animation.effect?.getComputedTiming()?.endTime !== Infinity) animation.finish(); } catch {} })',
  );

try {
  browser('set', 'viewport', '1440', '1000');
  open('/');
  browser('wait', '.hero-slide-current .hero-banner-link[href^="/events/"]');
  browser('focus', '.carousel-arrow-right');
  const first = evaluate(
    'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
  );
  click('Sorotan berikutnya');
  assert.notEqual(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    first,
  );
  finishAnimations();
  click('Sorotan sebelumnya');
  finishAnimations();
  assert.equal(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    first,
  );
  const count = evaluate('document.querySelectorAll(".carousel-dot").length');
  click(`Lihat sorotan ${count}`);
  click('Sorotan berikutnya');
  finishAnimations();
  assert.equal(
    evaluate(
      'document.querySelector(".hero-slide-current .hero-banner-link").getAttribute("href")',
    ),
    first,
    'Last banner wraps to first',
  );
  assert.equal(
    evaluate('document.querySelectorAll(".event-carousel button").length'),
    count + 2,
    'Only pagination and two arrows',
  );
  browser('click', '.hero-slide-current .hero-banner-link');
  browser('wait', '#event-title');
  assert.equal(evaluate('location.pathname'), first, 'Entire banner navigates to its event');

  const response = await fetch(new URL('/api/v1/events?limit=12', base));
  assert.equal(response.ok, true);
  const { data: events } = await response.json();
  let event;
  for (const item of events) {
    const result = await fetch(new URL(`/api/v1/events/${item.slug}`, base)).then((r) => r.json());
    if (
      result.data?.event?.isDemo &&
      result.data?.event?.ticketTypes.filter((ticket) => ticket.isOnSale && ticket.available > 0)
        .length >= 2
    ) {
      event = result.data.event;
      break;
    }
  }
  assert.ok(event, 'A published event with two available ticket categories is required');
  for (const width of [1440, 1024, 768, 390, 320]) {
    browser('set', 'viewport', String(width), '1000');
    open('/events');
    open(`/events/${event.slug}`);
    browser('wait', '#event-title');
    finishAnimations();
    evaluate('window.scrollTo({ top: 0, behavior: "instant" })');
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Detail fits ${width}px`,
    );
    assert.equal(browser('a11y').counts.violations, 0, `Detail accessibility at ${width}px`);
    const layout = evaluate(`(() => {
      const heading = document.querySelector('.event-detail-heading').getBoundingClientRect();
      const summary = document.querySelector('.event-detail-summary').getBoundingClientRect();
      const poster = document.querySelector('.event-detail-poster').getBoundingClientRect();
      return { headingRight: heading.right, summaryLeft: summary.left, headingTop: heading.top, posterBottom: poster.bottom };
    })()`);
    if (width >= 1024)
      assert.ok(layout.summaryLeft > layout.headingRight, 'Poster is beside event details');
    else
      assert.ok(
        layout.posterBottom <= layout.headingTop,
        'Mobile poster appears before event details',
      );
    assert.equal(
      evaluate('document.querySelectorAll("input[name=ticket-category]").length'),
      0,
      'Detail has no ticket selector',
    );
    assert.equal(
      evaluate(
        '[...document.querySelectorAll("[role=tab]")].some(tab => tab.textContent === "Tiket")',
      ),
      false,
    );
    browser(
      'click',
      width >= 1024 ? '.event-summary-card a[href^="/checkout/"]' : '.mobile-booking a',
    );
    browser('wait', '#tickets-heading');
    assert.equal(evaluate('location.pathname'), `/checkout/${event.slug}`);
    assert.equal(
      evaluate('document.querySelector("#checkout-name")'),
      null,
      'Buyer form is a separate stage',
    );
    assert.equal(
      evaluate('document.querySelector("button[type=submit]")'),
      null,
      'Cannot order before choosing tickets',
    );
    assert.equal(
      evaluate('document.querySelector("footer")'),
      null,
      'Checkout uses a minimal layout',
    );
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Checkout fits ${width}px`,
    );
    assert.equal(browser('a11y').counts.violations, 0, `Category accessibility at ${width}px`);
    const chosen = event.ticketTypes.filter(
      (ticket) => ticket.isOnSale && ticket.available >= ticket.minPerOrder,
    )[1];
    click(`Pilih tiket ${chosen.name}`);
    wait('!document.querySelector("aside button").disabled');
    const quantitySelector = `output[aria-label="Jumlah tiket ${chosen.name}"]`;
    assert.equal(
      evaluate(`document.querySelector(${JSON.stringify(quantitySelector)}).value`),
      String(chosen.minPerOrder),
    );
    click(`Kurangi tiket ${chosen.name}`);
    assert.equal(
      evaluate(`document.querySelector(${JSON.stringify(quantitySelector)})`),
      null,
      'Minimum quantity can be removed',
    );
    assert.equal(evaluate('document.querySelector("aside button").disabled'), true);
    click(`Pilih tiket ${chosen.name}`);
    wait('!document.querySelector("aside button").disabled');
    const other = event.ticketTypes.filter(
      (ticket) => ticket.isOnSale && ticket.available >= ticket.minPerOrder,
    )[0];
    click(`Pilih tiket ${other.name}`);
    wait('!document.querySelector("aside button").disabled');
    const expectedSubtotal = chosen.price * chosen.minPerOrder + other.price * other.minPerOrder;
    assert.ok(
      evaluate('document.querySelector("aside").textContent').includes(
        new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0,
        }).format(expectedSubtotal),
      ),
      'Mixed category subtotal matches',
    );
    click(`Kurangi tiket ${other.name}`);
    wait('!document.querySelector("aside button").disabled');
    click('Lanjutkan');
    browser('wait', '#checkout-name');
    assert.equal(
      evaluate(
        'document.querySelectorAll("[role=alert], #checkout-name-error, #checkout-email-error").length',
      ),
      0,
      'Moving to buyer details does not submit the form',
    );
    assert.equal(
      evaluate(
        'document.querySelector("[aria-current=step]").textContent.includes("Detail Pesanan")',
      ),
      true,
    );
    assert.equal(evaluate('document.querySelector("#tickets-heading")'), null);
    browser('fill', '#checkout-name', 'Checkout QA');
    click('Ubah pilihan tiket');
    browser('wait', '#tickets-heading');
    assert.equal(
      evaluate(`document.querySelector(${JSON.stringify(quantitySelector)}).value`),
      String(chosen.minPerOrder),
      'Back preserves tickets',
    );
    click('Lanjutkan');
    browser('wait', '#checkout-name');
    assert.equal(
      evaluate('document.querySelector("#checkout-name").value'),
      'Checkout QA',
      'Back preserves buyer details',
    );
    assert.equal(
      evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
      false,
      `Order details fit ${width}px`,
    );
    assert.equal(browser('a11y').counts.violations, 0, `Buyer accessibility at ${width}px`);
    if (width === 1440 && event.isDemo) {
      browser('fill', '#checkout-email', `checkout-qa-${Date.now()}@example.com`);
      browser('fill', '#checkout-phone', '+6281234567890');
      browser('select', '#checkout-identityType', 'KTP');
      browser('fill', '#checkout-identityNumber', '3171000000000001');
      for (let index = 0; index < chosen.minPerOrder; index += 1) {
        browser('check', `[aria-label="Detail Pesanan – ${index + 1}"] input[type=checkbox]`);
        browser('click', `label:has(input[name="holder-${index}-gender"][value=MALE])`);
        // Native date segments require a complete date value rather than text insertion.
        evaluate(
          `(() => { const input = document.querySelector('#holder-${index}-birthDate'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '1995-01-01'); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); })()`,
        );
      }
      browser('check', '[aria-labelledby=terms-heading] input[type=checkbox]');
      wait('!document.querySelector("button[type=submit]").disabled');
      click('Lanjut ke Pembayaran');
      browser('wait', '[role=dialog]');
      assert.equal(
        evaluate('location.pathname'),
        `/checkout/${event.slug}`,
        'Confirmation opens before creating the order',
      );
      click('Edit Data');
      wait('!document.querySelector("[role=dialog]")');
      assert.equal(evaluate('document.querySelector("#checkout-name").value'), 'Checkout QA');
      click('Lanjut ke Pembayaran');
      browser('wait', '[role=dialog]');
      click('Saya Mengerti');
      wait('location.pathname.startsWith("/order/")');
      browser('wait', '#payment-heading');
      assert.equal(
        evaluate('Boolean(new URLSearchParams(location.search).get("token"))'),
        true,
        'Guest order access token is retained',
      );
      assert.equal(
        evaluate(
          'document.querySelector("[aria-current=step]").textContent.includes("Metode Pembayaran")',
        ),
        true,
      );
      click('Lanjut ke Pembayaran');
      wait('document.body.textContent.includes("Simulasikan Pembayaran Berhasil")');
      assert.equal(
        evaluate(
          'document.querySelector("[aria-current=step]").textContent.includes("4Pembayaran")',
        ),
        true,
      );
      click('Simulasikan Pembayaran Berhasil');
      wait('document.body.textContent.includes("Pembayaran Berhasil & Terkonfirmasi!")');
      assert.ok(
        evaluate(
          '[...document.querySelectorAll("a")].filter(link => link.getAttribute("href")?.startsWith("/ticket/")).length',
        ) > 0,
        'Mock payment issues tickets',
      );
      wait('!document.querySelector("[data-sonner-toast]")');
      assert.deepEqual(browser('a11y').violations, [], 'Order accessibility');
    }
  }
  assert.deepEqual(browser('errors').errors, [], 'No browser runtime errors');
  process.stdout.write(
    'PASS banner links and wraparound, mobile poster before details, separate detail and checkout, ticket quantity removal, staged buyer form with preserved data at five widths, guest mock purchase, accessibility and zero browser errors.\n',
  );
} finally {
  browser('close');
}
