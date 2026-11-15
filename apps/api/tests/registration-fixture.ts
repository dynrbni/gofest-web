import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

async function main() {
  const [, , action, email] = process.argv;
  if (
    !env.isDevelopment ||
    env.EMAIL_PROVIDER !== 'console' ||
    !/^qa-registration-[a-z0-9-]+@example\.com$/.test(email ?? '')
  ) {
    throw new Error(
      'Registration browser fixture requires a development console-mail environment and an isolated QA address.',
    );
  }
  try {
    if (action === 'read') {
      const message = await prisma.emailNotification.findFirstOrThrow({
        where: { to: email, template: 'REGISTRATION_OTP' },
        orderBy: { createdAt: 'desc' },
      });
      const user = await prisma.user.findUnique({
        where: { email },
        select: { username: true, emailVerifiedAt: true },
      });
      console.log(JSON.stringify({ code: (message.payload as { code: string }).code, user }));
    } else if (action === 'cleanup') {
      await prisma.user.deleteMany({ where: { email } });
      await prisma.registrationChallenge.deleteMany({ where: { email } });
      await prisma.emailNotification.deleteMany({ where: { to: email } });
    } else throw new Error('Unknown fixture action');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
