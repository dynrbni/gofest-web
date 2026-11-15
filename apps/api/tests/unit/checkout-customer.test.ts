import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ageOnDate,
  checkoutPhoneSchema,
  createOrderSchema,
  ticketHolderSchema,
} from '@gofest/shared';
import { checkoutCustomerDetails } from '../helpers';

afterEach(() => vi.useRealTimers());
const person = () =>
  checkoutCustomerDetails([{ ticketTypeId: 'ticket-a', quantity: 1 }]).attendees[0]!;

describe('checkout customer validation', () => {
  it('uses the exact seventeenth birthday boundary', () => {
    expect(ageOnDate('2009-11-15', '2026-11-15')).toBe(17);
    expect(ageOnDate('2009-11-16', '2026-11-15')).toBe(16);
    expect(ageOnDate('2009-11-14', '2026-11-15')).toBe(17);
  });
  it.each(['2026-02-30', '2025-02-29', '2030-01-01', '1899-12-31', 'not-a-date'])(
    'rejects impossible, future and unsupported birth dates: %s',
    (birthDate) => {
      expect(ageOnDate(birthDate, '2026-11-15')).toBeNull();
    },
  );
  it('accepts a valid leap birthday', () => expect(ageOnDate('2012-02-29', '2026-11-15')).toBe(14));
  it.each(['KTP', 'SIM'])('rejects %s for minors and permits it at seventeen', (identityType) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T12:00:00Z'));
    expect(
      ticketHolderSchema.safeParse({ ...person(), identityType, birthDate: '2009-11-16' }).success,
    ).toBe(false);
    expect(
      ticketHolderSchema.safeParse({ ...person(), identityType, birthDate: '2009-11-15' }).success,
    ).toBe(true);
  });
  it.each(['PASSPORT', 'STUDENT_CARD'])('accepts %s for minors', (identityType) => {
    expect(
      ticketHolderSchema.safeParse({ ...person(), identityType, birthDate: '2015-01-01' }).success,
    ).toBe(true);
  });
  it('normalizes Indonesian and international phone numbers', () => {
    expect(checkoutPhoneSchema.parse('081234567890')).toBe('+6281234567890');
    expect(checkoutPhoneSchema.parse('+65 8123 4567')).toBe('+6581234567');
    expect(checkoutPhoneSchema.parse('+1 202 555 0123')).toBe('+12025550123');
    expect(checkoutPhoneSchema.safeParse('+65').success).toBe(false);
  });
  it('requires exactly one unique holder for every ordered ticket', () => {
    const customer = checkoutCustomerDetails([{ ticketTypeId: 'ticket-a', quantity: 2 }]);
    const order = {
      ...customer,
      eventId: 'event-a',
      buyerName: 'Buyer QA',
      buyerEmail: 'buyer@example.com',
      buyerPhone: '+6281234567890',
      items: [{ ticketTypeId: 'ticket-a', quantity: 2 }],
      acceptTerms: true,
      idempotencyKey: 'test-checkout-key',
    };
    expect(createOrderSchema.safeParse(order).success).toBe(true);
    expect(
      createOrderSchema.safeParse({ ...order, attendees: [customer.attendees[0]] }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...order,
        attendees: [customer.attendees[0], customer.attendees[0]],
      }).success,
    ).toBe(false);
    expect(
      createOrderSchema.safeParse({
        ...order,
        attendees: customer.attendees.map((holder) => ({
          ...holder,
          ticketTypeId: 'other-ticket',
        })),
      }).success,
    ).toBe(false);
  });
});
