// Business logic for authentication: credentials, sessions, and 2FA.
import { generateSecret, generateURI, verify } from "otplib";
import { checkPassword, hashPassword } from "../../lib/hash";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../lib/token";
import { ApiError } from "../../utils/ApiError";
import {
  createUser,
  enableTwoFactor,
  findUserByEmail,
  findUserById,
  setTwoFactorSecret,
  type PublicUser,
  type UserRole,
} from "./auth.repositories";

export { REFRESH_TOKEN_MAX_AGE_MS } from "../../lib/token";

const TWO_FACTOR_ISSUER = "NodeAdvancedAuthApp";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const normalizeEmail = (email: string) => email.toLowerCase().trim();

const toAuthUser = (user: PublicUser): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  twoFactorEnabled: user.twoFactorEnabled,
});

const createSession = (user: PublicUser): AuthSession => ({
  accessToken: createAccessToken(user.id, user.role, user.tokenVersion),
  refreshToken: createRefreshToken(user.id, user.tokenVersion),
  user: toAuthUser(user),
});

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "23505";

// ---------- register ----------

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> => {
  const email = normalizeEmail(input.email);
  if (await findUserByEmail(email)) {
    throw new ApiError(409, "User already exists!");
  }

  let user: PublicUser;
  try {
    user = await createUser({
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
    });
  } catch (error) {
    // Two concurrent sign-ups with the same email: the UNIQUE constraint wins.
    if (isUniqueViolation(error)) throw new ApiError(409, "User already exists!");
    throw error;
  }

  return toAuthUser(user);
};

// ---------- login / refresh ----------

export const loginUser = async (input: {
  email: string;
  password: string;
  twoFactorCode?: string | undefined;
}): Promise<AuthSession> => {
  const user = await findUserByEmail(normalizeEmail(input.email));
  if (!user || !(await checkPassword(input.password, user.passwordHash))) {
    throw new ApiError(400, "Invalid email or password");
  }
  if (user.twoFactorEnabled) {
    if (!input.twoFactorCode) throw new ApiError(400, "Two factor code is required");
    if (!user.twoFactorSecret) throw new ApiError(400, "Two factor is misconfigured for this account");

    // otplib v13 verify() is async; it must be awaited or every code passes.
    const { valid } = await verify({ secret: user.twoFactorSecret, token: input.twoFactorCode });
    if (!valid) throw new ApiError(400, "Invalid two factor code");
  }

  return createSession(user);
};

export const refreshSession = async (refreshToken: string): Promise<AuthSession> => {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) throw new ApiError(401, "Invalid refresh token");

  const user = await findUserById(payload.userId);
  if (!user) throw new ApiError(401, "User not found");
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, "Refresh token invalidated");
  }

  return createSession(user);
};

// For the requireAuth middleware: resolves a Bearer access token to the current user.
export const authenticateAccessToken = async (accessToken: string): Promise<AuthUser> => {
  const payload = verifyAccessToken(accessToken);
  if (!payload) throw new ApiError(401, "Invalid token");

  const user = await findUserById(payload.userId);
  if (!user) throw new ApiError(401, "User not found");
  if (user.tokenVersion !== payload.tokenVersion) throw new ApiError(401, "Token invalidated");

  return toAuthUser(user);
};

// ---------- two-factor auth ----------

export const setupTwoFactor = async (
  userId: number,
): Promise<{ otpAuthUrl: string; secret: string }> => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");
  // Re-running setup would silently disable active 2FA without a code.
  if (user.twoFactorEnabled) throw new ApiError(400, "2FA is already enabled");

  const secret = generateSecret();
  const otpAuthUrl = generateURI({ issuer: TWO_FACTOR_ISSUER, label: user.email, secret });
  await setTwoFactorSecret(user.id, secret);

  return { otpAuthUrl, secret };
};

export const verifyTwoFactor = async (userId: number, code: string): Promise<void> => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (!user.twoFactorSecret) throw new ApiError(400, "You don't have 2FA set up yet");

  const { valid } = await verify({ secret: user.twoFactorSecret, token: code });
  if (!valid) throw new ApiError(400, "Invalid two factor code");

  await enableTwoFactor(user.id);
};
