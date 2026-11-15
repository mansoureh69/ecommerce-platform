import "../globals.css";
import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans, Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { KhoshehFooter } from "../../components/khosheh-footer";
import { KhoshehHeader } from "../../components/khosheh-header";
import { direction, isLocale, locales, messages } from "../../i18n/config";
import { Providers } from "../providers";

const bodyFont = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const persianFont = Vazirmatn({ subsets: ["arabic"], variable: "--font-persian", display: "swap" });
const displayFont = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = await messages(locale);
  return { title: copy.brand.name, description: copy.brand.descriptor };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = await messages(locale);
  return (
    <html lang={locale} dir={direction(locale)} className={`${bodyFont.variable} ${persianFont.variable} ${displayFont.variable}`}>
      <body><Providers><KhoshehHeader locale={locale} copy={copy} />{children}<KhoshehFooter locale={locale} copy={copy} /></Providers></body>
    </html>
  );
}
