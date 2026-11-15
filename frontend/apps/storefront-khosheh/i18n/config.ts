export const locales = ["en", "fa", "ar"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function direction(locale: Locale): "ltr" | "rtl" {
  return locale === "en" ? "ltr" : "rtl";
}

export async function messages(locale: Locale) {
  return (await import(`../messages/${locale}.json`)).default;
}
