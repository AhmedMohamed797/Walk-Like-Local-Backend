import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

//*---------------global vars for expiry times
const RESET_CODE_EXPIRY_MS = 1 * 60 * 1000;
const EMAIL_VERIFICATION_EXPIRY_MS = 3 * 60 * 60 * 1000;

const smtpUser = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
const smtpPass = process.env.BREVO_SMTP_KEY || process.env.SMTP_PASS;

const transporter =
  smtpUser && smtpPass
    ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: smtpUser, pass: smtpPass },
    })
    : null;


//*------------------------------Tokens and pawssord functions
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


//*------------------------------Token generation for email and code verification
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
    process.env.API_BASE_URL?.replace(/\/$/, "") ||
    `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/api/v1/auth/verify-email?token=${token}`;
};


//*------------------------------Email sending functions
const sendEmail = async ({ to, subject, text, html }) => {
  const debugPayload = { to, subject, text };

  if (!transporter) {
    console.log("[EMAIL] Mock send:", debugPayload);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[EMAIL] Sending via SMTP:", debugPayload);
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || smtpUser,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[EMAIL] SMTP send failed:", error);
    }
    throw error;
  }
};

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
//*------------------------------Password reset email
export const sendPasswordResetEmail = async (user, code) => {
  await sendEmail({
    to: user.email,
    subject: "Your password reset code",
    text: `Hi ${user.fullName},\n\nYour password reset code is: ${code}\n\nIt expires in 60 seconds.`,
    html: `
      <p>Hi ${user.fullName},</p>
      <p>Your password reset code is: <strong>${code}</strong></p>
      <p>It expires in 60 seconds.</p>
    `,
  });
};
