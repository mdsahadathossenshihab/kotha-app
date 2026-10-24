const BN_DIGITS: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

export function toEnglishDigits(input: string) {
  return input.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
}

/** বাংলাদেশি নম্বরকে 8801XXXXXXXXX রূপে সাজায়। খালি হলে "" ফেরত দেয়। */
export function normalizePhone(raw: string): string | null {
  if (!raw || !raw.trim()) return "";
  let value = toEnglishDigits(raw).replace(/[\s\-()./]/g, "").trim();
  if (value.startsWith("+")) value = value.slice(1);
  if (!/^\d{6,15}$/.test(value)) return null;
  if (/^01\d{9}$/.test(value)) return `880${value.slice(1)}`;
  if (/^8801\d{9}$/.test(value)) return value;
  if (/^1\d{9}$/.test(value)) return `880${value}`;
  if (value.length >= 10) return value;
  return null;
}

/** দেখানোর জন্যঃ ০১৭১২-৩৪৫৬৭৮ */
export function prettyPhone(stored: string): string {
  if (!stored) return "";
  if (/^8801\d{9}$/.test(stored)) {
    const local = `0${stored.slice(3)}`;
    return `${local.slice(0, 5)}-${local.slice(5)}`;
  }
  return `+${stored}`;
}

export function localPhone(stored: string): string {
  if (!stored) return "";
  if (/^8801\d{9}$/.test(stored)) return `0${stored.slice(3)}`;
  return `+${stored}`;
}
