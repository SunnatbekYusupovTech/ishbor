import { EmailVerificationCode } from '@/models/EmailVerificationCode';
import { generateResetCode, hashResetCode } from '@/utils/otp';
import { sendVerificationEmail } from '@/utils/mailer';
import { env } from '@/config/env';

/**
 * Mints a fresh verification code for `userId`/`email`, replacing any
 * previous one, and emails it. Shared between `authController` (initial
 * registration) and `userController` (re-verifying a changed email address)
 * so both paths go through the exact same code-issuing logic.
 */
export async function issueVerificationCode(userId: string, email: string): Promise<void> {
  const code = generateResetCode();
  await EmailVerificationCode.deleteMany({ userId });
  await EmailVerificationCode.create({
    userId,
    codeHash: hashResetCode(code),
    expiresAt: new Date(Date.now() + env.passwordResetCodeTtlMinutes * 60 * 1000),
  });
  await sendVerificationEmail(email, code);
}
