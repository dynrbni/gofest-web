# Verified registration

Apply migrations with `pnpm --filter @gofest/api db:deploy` and regenerate Prisma client with `pnpm db:generate` when deploying this update. The migration adds nullable usernames to existing users, a registration challenge table and an email template enum value. It preserves existing accounts and data.

1. `POST /api/v1/auth/register/request-otp` with `{ email }`. Returns `{ challengeId, expiresAt, resendAt }` in the standard data envelope. The six-digit OTP is queued using `REGISTRATION_OTP`, expires in ten minutes and is not returned. A new request is allowed after 60 seconds and replaces earlier codes/proofs. Existing email addresses receive `EMAIL_ALREADY_REGISTERED`.
2. `POST /api/v1/auth/register/verify-otp` with `{ challengeId, code }`. Permits five attempts and one verification success. Returns `{ email, verificationToken, expiresAt }`. This random proof expires in 15 minutes, is bound to the verified email and does not create a user/session.
3. `POST /api/v1/auth/register` with `{ email, verificationToken, username, phone, password }`. Username is lowercase, unique, 3–24 ASCII letters/digits/underscores. Phone is a valid Indonesian mobile number. Password is 8–72 characters with letters and numbers. Returns the authenticated user and session cookies after atomically consuming the proof and creating a verified account. `USERNAME_TAKEN` preserves the proof so the user can choose another name; expired/missing proof returns `REGISTRATION_VERIFICATION_REQUIRED`.

The web UI splits the final data entry into Profile and Password screens for compact layouts. It keeps proof/password in memory only; reloading registration starts again at email. Existing users are not forced through the new flow to log in. Display names remain editable through the existing profile flow.

Configure `EMAIL_PROVIDER=smtp`, a provider-approved `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT` and optional SMTP username/password, then keep the email worker running. Existing port 465 configuration uses implicit TLS; other SMTP ports use Nodemailer's normal STARTTLS negotiation. Local `console` delivery writes preview text to the worker log; it does not deliver to a real inbox. Production configuration already rejects console email.

Verification: `pnpm check`, `pnpm test:browser`, `pnpm test:discovery`, `pnpm test:registration`. Registration browser fixtures run only against a development console-mail database, use isolated QA addresses and clean up their records.
