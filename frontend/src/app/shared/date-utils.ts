export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string | null | undefined): value is string {
  return Boolean(value) && Number.isFinite(Date.parse(value as string));
}
