"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "../../i18n/config";
import { heroImages } from "./images";
import { Icon } from "./icons";

interface Slide { badge: string; title: string; highlight: string; copy: string; alt: string }
export interface HeroCopy {
  slides: Slide[];
  cta: string;
  ctaDelivery: string;
  ready: string;
  protected: string;
  previous: string;
  next: string;
  goTo: string;
}

const INTERVAL_MS = 6000;

export function HeroSlider({ locale, copy }: { locale: Locale; copy: HeroCopy }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = copy.slides.length;
  useEffect(() => {
    // Auto-advance only for users who have not asked for reduced motion.
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, count]);
  const go = (index: number) => setActive((index + count) % count);
  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label={copy.slides[active]?.title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="hero-frame">
        {copy.slides.map((slide, index) => (
          <div key={slide.title} className="landing-slide" data-active={index === active} aria-hidden={index !== active} inert={index !== active}>
            <Image src={heroImages[index] ?? heroImages[0]!} alt={slide.alt} fill priority={index === 0} sizes="(max-width: 80rem) 100vw, 80rem" className="hero-photo" />
            <div className="hero-scrim" />
            <div className="hero-copy">
              <span className="hero-badge">{slide.badge}</span>
              <h1>
                {slide.title}
                <span>{slide.highlight}</span>
              </h1>
              <p>{slide.copy}</p>
              <div className="hero-actions">
                <Link className="pill pill-rose" href={`/${locale}/products`}>
                  {copy.cta}
                  <Icon name="arrow" size={18} />
                </Link>
                <Link className="pill pill-glass" href={`/${locale}#delivery`}>
                  <Icon name="truck" size={18} />
                  {copy.ctaDelivery}
                </Link>
              </div>
              <p className="hero-notes">
                <span>{copy.ready}</span>
                <span>{copy.protected}</span>
              </p>
            </div>
          </div>
        ))}
        <button type="button" className="hero-arrow hero-arrow-prev" aria-label={copy.previous} onClick={() => go(active - 1)}><Icon name="chevron" size={22} /></button>
        <button type="button" className="hero-arrow hero-arrow-next" aria-label={copy.next} onClick={() => go(active + 1)}><Icon name="chevron" size={22} /></button>
        <div className="hero-dots">
          {copy.slides.map((slide, index) => (
            <button key={slide.title} type="button" aria-label={`${copy.goTo} ${index + 1}`} aria-pressed={index === active} onClick={() => go(index)} />
          ))}
        </div>
      </div>
    </section>
  );
}
