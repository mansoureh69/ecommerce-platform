"use client";

/* eslint-disable @next/next/no-img-element -- exact markup of the approved design, hosted imagery */
import Link from "next/link";
import { useEffect, useState } from "react";

const IMG_1 = "https://lh3.googleusercontent.com/aida-public/AB6AXuBCeXKif8iyE6zKJMfAkHg-5bicN7UxSUExL-QmnukU6PU7h1a7QE_dQUbcbckemaljeqEfa6-P8de-zFO4AHWyp80xkNBuGW9C4j8CH_j-x9hOlDf_IS_k-DTpEbogF_i54xwVuAaN1sJ1RTOxa42dKnSRYj0jf0dwYXqHW2leZwZP8BGAWewllKM7_zfjEiMC70RxEuyyLtsnJ4Ek7ScwHFL0w75O_EWvAtBjTLo";
const IMG_2 = "https://lh3.googleusercontent.com/aida-public/AB6AXuBzyglwnGFWj3M250HxEJyqBzOwpnQa6SNuntL0n3fEk-6nZT4NiJH2o8n7JoBYc0nsEXyvnyQbP9bPz78R0WaXJxBbmetLAETqe5QSfENRPrrV-XdBlSPzTjBfABzvl3SbN-IbUXD6vLosVKCNG19CtJy0z8dB0jouqCURcL6X37-SCt_wKDokdJJFGgPEBCg46L_wXAmEwyX7Ya-cSkS2wCIs301cO9XdfgCIFyA";

const slideClass = "hero-slide absolute inset-0 w-full h-full transition-opacity duration-700";
const glass = "px-6 py-3.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white font-bold hover:bg-white/25 transition-all";

export function Hero({ locale }: { locale: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % 2), 5000);
    return () => window.clearInterval(id);
  }, [paused]);
  const state = (index: number) => (index === active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none");
  const home = `/${locale}`;
  return (
    <section
      className="relative w-full overflow-hidden bg-gradient-to-b from-surface-alabaster via-craft-sand/40 to-surface-ivory py-6 lg:py-10 px-4 sm:px-6 lg:px-12"
      aria-roledescription="carousel"
      aria-label="اسلایدر معرفی گل‌فروشی خوشه"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="max-w-7xl mx-auto relative rounded-3xl overflow-hidden shadow-2xl border border-craft-burlap/20 bg-forest-deep min-h-[580px] lg:min-h-[640px] flex items-center">
        <div className="relative w-full h-full min-h-[580px] lg:min-h-[640px]" id="heroTrack">
          <div className={`${slideClass} ${state(0)}`} aria-hidden={active !== 0} inert={active !== 0}>
            <img alt="کارگاه گل‌آرایی خوشه اهواز با گل‌های تازه و معطر" className="w-full h-full object-cover brightness-[0.78] contrast-[1.05]" src={IMG_1} />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-forest-deep/95 via-forest-deep/60 to-transparent flex items-center">
              <div className="p-6 sm:p-12 lg:p-16 max-w-2xl text-white space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-coral-vibrant text-white text-xs font-black shadow-lg">
                  <span className="material-symbols-outlined text-sm">local_fire_department</span>
                  <span>الهام‌گرفته از جذاب‌ترین آتلیه‌های روز دنیا</span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight drop-shadow-md">
                  عطر و رنگ گل‌های جنوب، <br className="hidden sm:inline" />
                  <span className="text-tangerine">دست‌پیچ اختصاصی اهواز</span>
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-amber-50 leading-relaxed max-w-xl text-justify font-medium">
                  شور و سرزندگی بوگنویلاهای کارون و شاداب‌ترین شکوفه‌های طبیعی ایران در بسته‌بندی امضادار کنفی و کرافت؛ تازه، پرانرژی و مقاوم در برابر گرمای خوزستان با ژل آبرسان اختصاصی.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link className="px-7 py-3.5 rounded-full bg-coral-vibrant text-white font-black hover:bg-coral-dark transition-all transform hover:-translate-y-0.5 shadow-xl shadow-coral-vibrant/40 flex items-center gap-2" href={`${home}#bouquets`}>
                    <span>مشاهده دسته‌گل‌های امروز</span>
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                  </Link>
                  <Link className={`${glass} flex items-center gap-2`} href={`${home}#craft-style`}>
                    <span className="material-symbols-outlined text-lg">near_me</span>
                    <span>تحویل ۲ ساعته کیانپارس و سراسر اهواز</span>
                  </Link>
                </div>
                <div className="pt-3 flex items-center gap-6 text-xs text-amber-200 font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-mint-fresh animate-ping" />آماده ارسال فوری</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">ac_unit</span>خنک‌ساز یخچال‌دار خودرویی</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${slideClass} ${state(1)}`} aria-hidden={active !== 1} inert={active !== 1}>
            <img alt="دسته‌گل امضادار کرافت و کنفی خوشه اهواز" className="w-full h-full object-cover brightness-[0.8] contrast-[1.05]" src={IMG_2} />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-forest-deep/95 via-forest-deep/60 to-transparent flex items-center">
              <div className="p-6 sm:p-12 lg:p-16 max-w-2xl text-white space-y-5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sun-gold text-forest-deep text-xs font-black shadow-lg">
                  <span className="material-symbols-outlined text-sm">eco</span>
                  <span>دست‌پیچ سازگار با محیط زیست ۱۰۰٪ کرافت</span>
                </div>
                <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight drop-shadow-md">
                  دست‌پیک امضادار خوشه <br className="hidden sm:inline" />
                  <span className="text-sun-gold">با کاغذ کرافت و کنف طبیعی</span>
                </h2>
                <p className="text-sm sm:text-base lg:text-lg text-amber-50 leading-relaxed max-w-xl text-justify font-medium">
                  گلی که آزادانه نفس می‌کشد و با هنر اصیل استودیو خوشه پیچیده شده است. پر از پئونی‌های مخملی، رزهای آتشین و رنگ‌های پرحرارت که تا ۷ روز کامل در گلدان منزل شما طراوت دارند.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link className="px-7 py-3.5 rounded-full bg-tangerine text-white font-black hover:bg-coral-vibrant transition-all transform hover:-translate-y-0.5 shadow-xl shadow-tangerine/40 flex items-center gap-2" href={`${home}#bouquets`}>
                    <span>سفارش همین دسته‌گل</span>
                    <span className="material-symbols-outlined text-lg">shopping_basket</span>
                  </Link>
                  <Link className={glass} href={`${home}#craft-style`}>راز ماندگاری در اهواز</Link>
                </div>
                <div className="pt-3 flex items-center gap-6 text-xs text-amber-200 font-bold">
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">verified</span>ضمانت ۱۰۰٪ شادابی</span>
                  <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">card_giftcard</span>کارت‌پستال خوشنویسی رایگان</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5">
          {[0, 1].map((index) => (
            <button
              key={index}
              type="button"
              aria-label={`نمایش اسلاید ${(index + 1).toLocaleString("fa-IR")}`}
              aria-pressed={index === active}
              className={`hero-dot h-2.5 rounded-full transition-all ${index === active ? "w-9 bg-coral-vibrant" : "w-2.5 bg-white/50 hover:bg-white"}`}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
