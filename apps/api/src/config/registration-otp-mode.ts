export function canUseRegistrationTestOtp(
  nodeEnv: string,
  emailProvider: string,
  enabled: boolean,
) {
  return enabled && nodeEnv === 'development' && emailProvider === 'console';
}
