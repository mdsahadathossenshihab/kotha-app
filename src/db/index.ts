import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

/**
 * লোকাল ডাটাবেসে SSL লাগে না, কিন্তু Neon / Supabase / Vercel Postgres-এ লাগে।
 * তাই ঠিকানা দেখে নিজে থেকেই ঠিক করে নেওয়া হয়।
 */
const isLocal =
  databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1");

const needsSsl =
  !isLocal &&
  !databaseUrl.includes("sslmode=disable");

const globalForDb = globalThis as typeof globalThis & {
  __kothaPgPool?: Pool;
};

export const pool =
  globalForDb.__kothaPgPool ??
  new Pool({
    connectionString: databaseUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    // সার্ভারলেসে প্রতিটি ইনস্ট্যান্সে অল্প কানেকশন রাখা ভালো
    max: isLocal ? 10 : 3,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 12_000,
    keepAlive: true,
  });

// একই পুল বারবার ব্যবহার করা হয় (ডেভ ও সার্ভারলেস দুটোতেই)
globalForDb.__kothaPgPool = pool;

pool.on("error", (err) => {
  console.error("ডাটাবেস পুলে সমস্যা:", err.message);
});

export const db = drizzle(pool);
