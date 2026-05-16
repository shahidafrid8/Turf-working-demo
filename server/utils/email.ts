export function normalizeEmail(input: string): string {
  const value = input.trim().toLowerCase();
  const [local, domain] = value.split("@");
  if (!local || !domain) return value;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const canonicalLocal = local.split("+")[0].replace(/\./g, "");
    return `${canonicalLocal}@gmail.com`;
  }
  return `${local}@${domain}`;
}
