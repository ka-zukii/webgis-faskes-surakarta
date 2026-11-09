/** Kunci pencocokan nama wilayah: tanpa spasi dan huruf kecil ("Pasar Kliwon" = "Pasarkliwon"). */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

/** Membuang awalan seperti "Kelurahan " atau "Kecamatan " dari nama fitur batas. */
export function stripPrefix(value: string, prefix: string): string {
  const trimmed = value.trim();
  const lowerPrefix = `${prefix.toLowerCase()} `;
  return trimmed.toLowerCase().startsWith(lowerPrefix) ? trimmed.slice(lowerPrefix.length).trim() : trimmed;
}
