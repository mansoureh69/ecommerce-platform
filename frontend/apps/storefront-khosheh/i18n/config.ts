export const locales = ["fa"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export const direction = "rtl";

export async function messages(locale: Locale) {
  return (await import(`../messages/${locale}.json`)).default;
}
