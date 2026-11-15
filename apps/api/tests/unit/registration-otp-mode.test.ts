import { describe, expect, it } from 'vitest';
import { canUseRegistrationTestOtp } from '../../src/config/registration-otp-mode';

describe('registration testing OTP boundary', () => {
  it.each([
    ['development', 'console', true, true],
    ['development', 'console', false, false],
    ['development', 'smtp', true, false],
    ['production', 'console', true, false],
    ['production', 'smtp', true, false],
    ['test', 'console', true, false],
  ] as const)(
    '%s / %s / enabled=%s allows testing OTP: %s',
    (mode, provider, enabled, expected) => {
      expect(canUseRegistrationTestOtp(mode, provider, enabled)).toBe(expected);
    },
  );
});
