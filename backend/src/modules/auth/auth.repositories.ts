// Data-access layer for authentication: all SQL touching the users table lives here.
import { query } from "../../config/db";

export type UserRole = "user" | "admin";

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

// User shape that is safe to send to clients (no secrets or tokens).
export type PublicUser = Omit<
  User,
  "passwordHash" | "twoFactorSecret"
>;

export type AdminUserListItem = Pick<
  User,
  "id" | "email" | "role" | "createdAt"
>;

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: UserRole;
}

const USER_COLUMNS = `
  id,
  email,
  password_hash AS "passwordHash",
  role,
  name,
  two_factor_enabled AS "twoFactorEnabled",
  two_factor_secret AS "twoFactorSecret",
  token_version AS "tokenVersion",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const PUBLIC_USER_COLUMNS = `
  id,
  email,
  role,
  name,
  two_factor_enabled AS "twoFactorEnabled",
  token_version AS "tokenVersion",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

// Register and login.
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query<User>(
    `SELECT ${USER_COLUMNS} FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
};

// Refresh, requireAuth, and 2FA setup/verify.
export const findUserById = async (id: number): Promise<User | null> => {
  const result = await query<User>(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
};

export const createUser = async ({
  email,
  passwordHash,
  name = null,
  role = "user",
}: CreateUserInput): Promise<PublicUser> => {
  const result = await query<PublicUser>(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_USER_COLUMNS}`,
    [email, passwordHash, name, role],
  );
  return result.rows[0]!;
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
             created_at AS "createdAt"
     FROM users
     ORDER BY created_at DESC`,
  );
  return result.rows;
};
