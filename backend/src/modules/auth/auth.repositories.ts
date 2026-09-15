// Data-access layer for authentication: all SQL touching the users table lives here.
import { query } from "../../config/db";

export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  name: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  tokenVersion: number;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// User shape that is safe to send to clients (no secrets or tokens).
export type PublicUser = Omit<
  User,
  "passwordHash" | "twoFactorSecret" | "resetPasswordToken" | "resetPasswordExpires"
>;

export type AdminUserListItem = Pick<
  User,
  "id" | "email" | "role" | "isEmailVerified" | "createdAt"
>;

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: UserRole;
  isEmailVerified?: boolean;
}

const USER_COLUMNS = `
  id,
  email,
  password_hash AS "passwordHash",
  role,
  is_email_verified AS "isEmailVerified",
  name,
  two_factor_enabled AS "twoFactorEnabled",
  two_factor_secret AS "twoFactorSecret",
  token_version AS "tokenVersion",
  reset_password_token AS "resetPasswordToken",
  reset_password_expires AS "resetPasswordExpires",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const PUBLIC_USER_COLUMNS = `
  id,
  email,
  role,
  is_email_verified AS "isEmailVerified",
  name,
  two_factor_enabled AS "twoFactorEnabled",
  token_version AS "tokenVersion",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

// Register, login, forgot-password, Google callback.
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query<User>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
};

// Verify-email, refresh, requireAuth, 2FA setup/verify.
export const findUserById = async (id: number): Promise<User | null> => {
  const result = await query<User>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
};

// Register (unverified) and Google callback (isEmailVerified: true).
export const createUser = async ({
  email,
  passwordHash,
  name = null,
  role = "user",
  isEmailVerified = false,
}: CreateUserInput): Promise<PublicUser> => {
  const result = await query<PublicUser>(
    `INSERT INTO users (email, password_hash, name, role, is_email_verified)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [email, passwordHash, name, role, isEmailVerified],
  );
  return result.rows[0]!;
};

// Verify-email and Google callback for an existing unverified user.
export const markEmailVerified = async (id: number): Promise<void> => {
  await query(
    `UPDATE users
     SET is_email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id],
  );
};

// Forgot-password: store a HASH of the reset token, never the raw token sent to the user.
export const setResetPasswordToken = async (
  id: number,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> => {
  await query(
    `UPDATE users
     SET reset_password_token = $2,
         reset_password_expires = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, tokenHash, expiresAt],
  );
};

// Reset-password: only matches tokens whose expiry is still in the future.
export const findUserByResetToken = async (tokenHash: string): Promise<User | null> => {
  const result = await query<User>(
    `SELECT ${USER_COLUMNS}
     FROM users
     WHERE reset_password_token = $1
       AND reset_password_expires > CURRENT_TIMESTAMP`,
    [tokenHash],
  );
  return result.rows[0] ?? null;
};

// Reset-password: sets the new hash, clears the reset token and bumps token_version
// so every previously issued access/refresh token is invalidated.
export const updatePassword = async (id: number, passwordHash: string): Promise<void> => {
  await query(
    `UPDATE users
     SET password_hash = $2,
         reset_password_token = NULL,
         reset_password_expires = NULL,
         token_version = token_version + 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, passwordHash],
  );
};

// 2FA setup: saves a fresh secret and keeps 2FA disabled until the user verifies a code.
export const setTwoFactorSecret = async (id: number, secret: string): Promise<void> => {
  await query(
    `UPDATE users
     SET two_factor_secret = $2,
         two_factor_enabled = FALSE,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [id, secret],
  );
};

// 2FA verify: turns 2FA on once a code has been confirmed.
export const enableTwoFactor = async (id: number): Promise<void> => {
  await query(
    `UPDATE users
     SET two_factor_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND two_factor_secret IS NOT NULL`,
    [id],
  );
};

// Admin: list all users, newest first.
export const listUsers = async (): Promise<AdminUserListItem[]> => {
  const result = await query<AdminUserListItem>(
    `SELECT id,
            email,
            role,
            is_email_verified AS "isEmailVerified",
            created_at AS "createdAt"
     FROM users
     ORDER BY created_at DESC`,
  );
  return result.rows;
};
