import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

export function newId() {
  return crypto.randomUUID();
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function codePepper() {
  return process.env.NOTEA_CODE_PEPPER ?? "notea-dev-pepper";
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function hashCode(code: string) {
  return hashToken(`${codePepper()}:${code}`);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string) {
  return phone.trim().replace(/\s+/g, "");
}
