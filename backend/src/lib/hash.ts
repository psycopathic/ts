// Password hashing (bcrypt) and one-way hashing for stored tokens (SHA-256).
import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// For tokens we look up by value (e.g. password reset): store only the hash, never the raw token.
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export const generateRandomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
