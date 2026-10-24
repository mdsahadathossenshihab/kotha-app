import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const SECRET = process.env.SESSION_SECRET ?? "kotha-bangla-dev-secret-key-2026";
export const SESSION_COOKIE = "kotha_session";
const MAX_AGE = 60 * 60 * 24 * 30; // ৩০ দিন

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createToken(userId: number): string {
  const exp = Date.now() + MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawId, rawExp, sig] = parts;
  if (sign(`${rawId}.${rawExp}`) !== sig) return null;
  if (Number(rawExp) < Date.now()) return null;
  const id = Number(rawId);
  return Number.isFinite(id) ? id : null;
}

export async function setSession(userId: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  return readToken(store.get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const id = await getSessionUserId();
  if (!id) return null;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("লগইন করা নেই");
  }
}

export function unauthorized() {
  return Response.json({ error: "লগইন করা নেই" }, { status: 401 });
}

export function publicUser(user: {
  id: number;
  name: string;
  email: string;
  phone: string;
  about: string;
  avatar: string;
  color: string;
  lastSeen: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    about: user.about,
    avatar: user.avatar,
    color: user.color,
    lastSeen: user.lastSeen,
  };
}
