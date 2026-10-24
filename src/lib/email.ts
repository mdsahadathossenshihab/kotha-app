/** ইমেইল যাচাই ও সাজানো */

const BN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

export function normalizeEmail(raw: string): string | null {
  if (!raw) return null;
  const value = raw
    .replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d)
    .trim()
    .toLowerCase();
  if (value.length > 160) return null;
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(value)) return null;
  return value;
}

/** দেখানোর জন্য আংশিক লুকানো ইমেইলঃ ra•••@gmail.com */
export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

export function emailProviderName(email: string): string {
  const domain = email.split("@")[1] ?? "";
  if (domain.includes("gmail")) return "Gmail";
  if (domain.includes("yahoo")) return "Yahoo Mail";
  if (domain.includes("outlook") || domain.includes("hotmail")) return "Outlook";
  return domain;
}

export function inboxUrl(email: string): string {
  const domain = email.split("@")[1] ?? "";
  if (domain.includes("gmail")) return "https://mail.google.com/";
  if (domain.includes("yahoo")) return "https://mail.yahoo.com/";
  if (domain.includes("outlook") || domain.includes("hotmail")) return "https://outlook.live.com/";
  return "";
}
