/* eslint-disable @next/next/no-img-element -- exact markup of the approved design */
import Link from "next/link";

const links = [
  ["دسته‌گل‌های روزانه اهواز", "#bouquets"],
  ["دسته‌گل مناسبتی (تولد و سالگرد)", "#occasions"],
  ["دسته‌گل عروس و نامزدی", "#occasions"],
  ["باکس گل و سبد حصیری", "#occasions"],
  ["سبک دست‌پیچ کنفی و کرافت", "#craft-style"],
  ["گل‌آرایی ماشین عروس", "#occasions"],
  ["دیزاین مجالس و تشریفات", "#occasions"],
  ["تاج گل تبریک و تسلیت", "#occasions"],
] as const;

export function SiteFooter({ locale }: { locale: string }) {
  return (
    <footer className="w-full bg-surface-alabaster text-ink-primary pt-16 pb-12 border-t border-craft-burlap/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 shrink-0">
              <img alt="لوگوی خوشه اهواز" className="w-full h-full object-contain" src="/images/khosheh-logo.jpg" />
            </div>
            <div>
              <h3 className="font-black text-lg text-forest-deep">استودیو گل‌آرایی خوشه</h3>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-ink-soft leading-relaxed text-justify">
            نخستین آتلیه گل‌آرایی مدرن در اهواز؛ آمیخته با عطر گل‌های کارون، کاغذهای کرافت دست‌ساز، و بسته‌بندی مقاوم حرارتی جهت اهدای شادابی بی‌وقفه در سراسر استان خوزستان.
          </p>
          <div className="flex items-center gap-2 text-xs font-bold text-coral-vibrant pt-1">
            <span className="material-symbols-outlined text-base">verified_user</span>
            <span>ضمانت طراوت و شادابی ۷ روزه در دمای اهواز</span>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="font-black text-base text-forest-deep">آدرس آتلیه و ارتباط مستقیم</h4>
          <ul className="space-y-2.5 text-xs sm:text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-coral-vibrant text-lg shrink-0 mt-0.5">location_on</span>
              <span><strong>آدرس استودیو:</strong> اهواز، کیانپارس، خیابان پهلوان شرقی، استودیو گل‌آرایی خوشه</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="material-symbols-outlined text-coral-vibrant text-lg shrink-0 mt-0.5">schedule</span>
              <span><strong>ساعات کاری:</strong> شنبه تا پنج‌شنبه ۸ صبح تا ۲۲:۳۰ (جمعه‌ها تا ۲۰:۰۰)</span>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-black text-base text-forest-deep">دسته‌بندی‌ها و خدمات</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-soft">
            <li><Link className="hover:text-coral-vibrant transition-colors" href={`/${locale}/products`}>همه دسته‌گل‌ها</Link></li>
            {links.map(([label, hash]) => (
              <li key={label}><Link className="hover:text-coral-vibrant transition-colors" href={`/${locale}${hash}`}>{label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-black text-base text-forest-deep">حساب کاربری</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-soft">
            <li><Link className="hover:text-coral-vibrant transition-colors" href={`/${locale}/login`}>ورود</Link></li>
            <li><Link className="hover:text-coral-vibrant transition-colors" href={`/${locale}/register`}>ساخت حساب</Link></li>
            <li><Link className="hover:text-coral-vibrant transition-colors" href={`/${locale}/cart`}>سبد خرید</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-6 border-t border-craft-burlap/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-mute">
        <p>© ۱۴۰۵ گل‌فروشی خوشه اهواز (Khoshe Botanique). تمام حقوق برای استودیو خوشه محفوظ است.</p>
        <p className="font-bold text-coral-vibrant">طراحی شده با الهام از طراوت کارون و ظرافت هنرمندان استودیو گل‌آرایی خوشه</p>
      </div>
    </footer>
  );
}
