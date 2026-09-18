// Password hashing and verification with bcrypt.
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 10;

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_ROUNDS);

export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
