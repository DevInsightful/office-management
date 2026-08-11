const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FacebookIdRowInput = {
  email: string;
  facebookPassword: string;
  emailPassword: string;
};

export type FacebookIdRowValidation =
  | { valid: true; data: { email: string; facebookPassword: string | null; emailPassword: string | null } }
  | { valid: false; reason: string };

export function validateFacebookIdRow(input: FacebookIdRowInput): FacebookIdRowValidation {
  const email = input.email.trim();
  const facebookPassword = input.facebookPassword.trim();
  const emailPassword = input.emailPassword.trim();

  if (!email) {
    return { valid: false, reason: "Missing email" };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { valid: false, reason: "Invalid email format" };
  }

  if (!facebookPassword && !emailPassword) {
    return { valid: false, reason: "Missing both passwords" };
  }

  return {
    valid: true,
    data: {
      email,
      facebookPassword: facebookPassword || null,
      emailPassword: emailPassword || null,
    },
  };
}
