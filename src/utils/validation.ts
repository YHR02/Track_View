export function safeParseFloat(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = parseFloat(String(val));
  return isNaN(num) ? fallback : num;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
