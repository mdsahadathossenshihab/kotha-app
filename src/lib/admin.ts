import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { KEYS, getSetting, setSetting } from "@/lib/settings";

const SECRET = process.env.SESSION_SECRET ?? "kotha-bangla-dev-secret-key-2026";
const ADMIN_COOKIE = "kotha_admin";
const MAX_AGE = 60 * 60 * 8; // ৮ ঘণ্টা

const hash = (value: string) =>
  createHash("sha256").update(`${value}:kotha-admin`).digest("hex");

export async function hasAdminPasscode(): Promise<boolean> {
  return Boolean(await getSetting(KEYS.adminHash));
}

export async function setAdminPasscode(passcode: string) {
  await setSetting(KEYS.adminHash, hash(passcode));
}

export async function checkPasscode(passcode: string): Promise<boolean> {
  const stored = await getSetting(KEYS.adminHash);
  if (!stored) return false;
  const a = Buffer.from(hash(passcode));
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sign(value: string) {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export async function startAdminSession() {
  const exp = Date.now() + MAX_AGE * 1000;
  const token = `${exp}.${sign(`admin.${exp}`)}`;
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  return sign(`admin.${exp}`) === sig;
}

export async function endAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
