import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

//*--------------- Global vars for expiry times
const RESET_CODE_EXPIRY_MS = 10 * 60 * 1000;
const EMAIL_VERIFICATION_EXPIRY_MS = 3 * 60 * 60 * 1000;

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

//*------------------------------ Tokens and password functions
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const comparePasswords = async (password, hashedPassword) => {
  if (!hashedPassword) return false;
  return bcrypt.compare(password, hashedPassword);
};

export const signJwt = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

//*------------------------------ Token generation for email and code verification
export const generateRandomToken = () => crypto.randomBytes(32).toString("hex");

export const generateResetCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const compareHashedValue = (plain, hashed) => hashValue(plain) === hashed;

export const getResetCodeExpiry = () => new Date(Date.now() + RESET_CODE_EXPIRY_MS);

export const getEmailVerificationExpiry = () =>
  new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS);

export const buildVerificationLink = (token) => {
  const baseUrl =
    process.env.FRONTEND_URL?.replace(/\/$/, "") || "http://localhost:5173";
  return `${baseUrl}/signup?token=${token}`;
};

//*------------------------------ Core email sender via Brevo HTTP API
const sendEmail = async ({ to, subject, text, html }) => {
  const debugPayload = { to, subject, text };

  if (!BREVO_API_KEY) {
    console.log("[EMAIL] No BREVO_API_KEY set — mock send:", debugPayload);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[EMAIL] Sending via Brevo API:", debugPayload);
  }

  const senderEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!senderEmail) {
    throw new Error("No sender email configured. Set EMAIL_FROM in your environment variables.");
  }

  const body = {
    sender: { email: senderEmail },
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html,
  };

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Brevo API error ${response.status}: ${errorText}`);
    if (process.env.NODE_ENV !== "production") {
      console.error("[EMAIL] Brevo send failed:", error.message);
    }
    throw error;
  }
};

//*------------------------------ Verification email
export const sendVerificationEmail = async (user, rawToken) => {
  const link = buildVerificationLink(rawToken);

  await sendEmail({
    to: user.email,
    subject: "Verify your Walk Like Local account",
    text: `Hi ${user.fullName},\n\nVerify your email: ${link}\n\nThis link expires in 24 hours.`,
    html: `
      <p>Hi ${user.fullName},</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${link}">Verify email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

//*------------------------------ Password reset email
export const sendPasswordResetEmail = async (user, code) => {
  await sendEmail({
    to: user.email,
    subject: "Your password reset code",
    text: `Hi ${user.fullName},\n\nYour password reset code is: ${code}\n\nIt expires in 10 minutes.`,
    html: `
      <p>Hi ${user.fullName},</p>
      <p>Your password reset code is: <strong>${code}</strong></p>
      <p>It expires in 10 minutes.</p>
    `,
  });
};