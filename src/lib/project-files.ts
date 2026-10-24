import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

/** যেসব ফোল্ডার/ফাইল GitHub-এ যাবে না */
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "drizzle",
  "android",
  ".turbo",
  ".cache",
]);

const SKIP_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "next-env.d.ts",
  ".DS_Store",
  "tsconfig.tsbuildinfo",
]);

const SKIP_EXT = new Set([".log", ".keystore", ".apk", ".aab", ".tsbuildinfo"]);

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2"]);

export type ProjectFile = {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
  size: number;
};

async function walk(dir: string, acc: string[]) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).split(path.sep).join("/");

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, acc);
      continue;
    }

    if (SKIP_FILES.has(entry.name)) continue;
    if (SKIP_EXT.has(path.extname(entry.name))) continue;

    const info = await stat(full);
    if (info.size > 4 * 1024 * 1024) continue; // ৪ MB-এর বড় ফাইল বাদ

    acc.push(rel);
  }
}

/** পুরো প্রজেক্টের ফাইলগুলো পড়ে নেয় */
export async function collectProjectFiles(): Promise<ProjectFile[]> {
  const paths: string[] = [];
  await walk(ROOT, paths);
  paths.sort();

  const files: ProjectFile[] = [];
  for (const rel of paths) {
    const abs = path.join(ROOT, rel);
    const ext = path.extname(rel).toLowerCase();
    const binary = BINARY_EXT.has(ext);
    const buf = await readFile(abs);
    files.push({
      path: rel,
      content: binary ? buf.toString("base64") : buf.toString("utf-8"),
      encoding: binary ? "base64" : "utf-8",
      size: buf.length,
    });
  }

  return files;
}
