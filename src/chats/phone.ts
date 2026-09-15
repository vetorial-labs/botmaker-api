export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Variantes de contactId WhatsApp BR (com/sem 9 extra, com/sem 55). */
export function whatsappContactIdVariants(phone: string): string[] {
  const raw = digitsOnly(phone);
  if (!raw) {
    return [];
  }
  const out = new Set<string>();
  out.add(raw);
  const with55 = raw.startsWith("55") ? raw : `55${raw}`;
  out.add(with55);
  if (with55.startsWith("55") && with55.length === 13) {
    const ddd = with55.slice(2, 4);
    const rest = with55.slice(4);
    if (rest.startsWith("9") && rest.length === 9) {
      out.add(`55${ddd}${rest.slice(1)}`);
    }
  }
  if (with55.startsWith("55") && with55.length === 12) {
    const ddd = with55.slice(2, 4);
    const rest = with55.slice(4);
    out.add(`55${ddd}9${rest}`);
  }
  return [...out];
}
