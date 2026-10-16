const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+?';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

/** A uniformly random index below `max`, by rejecting bytes that would bias the result. */
function pick(max: number, randomBytes: (count: number) => Uint8Array): number {
  const limit = 256 - (256 % max);
  for (;;) {
    for (const byte of randomBytes(32)) if (byte < limit) return byte % max;
  }
}

/**
 * A random password with at least one lowercase, uppercase, digit and symbol.
 * Look-alike characters (0/O, 1/l/I) are left out so it can be read aloud or typed from a screen.
 */
export function generatePassword(
  randomBytes: (count: number) => Uint8Array,
  length = 20,
): string {
  const chars = [LOWER, UPPER, DIGITS, SYMBOLS].map((set) => set[pick(set.length, randomBytes)]);
  while (chars.length < length) chars.push(ALL[pick(ALL.length, randomBytes)]);
  // Fisher-Yates, so the guaranteed characters do not always lead.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = pick(i + 1, randomBytes);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
