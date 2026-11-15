import Image from "next/image";
import Link from "next/link";
import type { Locale } from "../../i18n/config";
import { craftImage, galleryImages, occasionImages } from "./images";
import { Icon, type IconName } from "./icons";

interface TextItem { title: string; text: string }

export interface LandingCopy {
  trust: TextItem[];
  craft: { eyebrow: string; title: string; body: string; caption: string; alt: string; cards: TextItem[] };
  occasions: { eyebrow: string; title: string; items: TextItem[] };
  delivery: { eyebrow: string; title: string; intro: string; zones: Array<{ name: string; time: string }> };
  social: { title: string; alt: string };
}

const trustIcons: IconName[] = ["snow", "bolt", "box", "heart"];

export function TrustStrip({ items }: { items: TextItem[] }) {
  return (
    <section className="trust" aria-label={items.map((i) => i.title).join(", ")}>
      <ul>
        {items.map((item, index) => (
          <li key={item.title}>
            <span className={`trust-icon trust-icon-${index}`}><Icon name={trustIcons[index] ?? "leaf"} size={22} /></span>
            <span>
              <strong>{item.title}</strong>
              {item.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Craft({ copy }: { copy: LandingCopy["craft"] }) {
  return (
    <section id="craft" className="band band-alt" aria-labelledby="craft-title">
      <div className="craft">
        <figure>
          <Image src={craftImage} alt={copy.alt} width={1200} height={960} sizes="(max-width: 64rem) 100vw, 40rem" />
          <figcaption>{copy.caption}</figcaption>
        </figure>
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2 id="craft-title">{copy.title}</h2>
          <p className="lead">{copy.body}</p>
          <ul className="detail-cards">
            {copy.cards.map((card, index) => (
              <li key={card.title}>
                <span className={index === 0 ? "detail-icon is-rose" : "detail-icon is-sage"}><Icon name={index === 0 ? "leaf" : "box"} size={21} /></span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Occasions({ locale, copy }: { locale: Locale; copy: LandingCopy["occasions"] }) {
  return (
    <section id="occasions" className="band" aria-labelledby="occasions-title">
      <div className="band-inner">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="occasions-title">{copy.title}</h2>
        <ul className="occasion-grid">
          {copy.items.map((item, index) => (
            <li key={item.title}>
              <Link href={`/${locale}/products`}>
                <Image src={occasionImages[index] ?? occasionImages[0]!} alt="" fill sizes="(max-width: 48rem) 100vw, 25vw" />
                <span className="occasion-text">
                  <strong>{item.title}</strong>
                  {item.text}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Delivery({ copy }: { copy: LandingCopy["delivery"] }) {
  return (
    <section id="delivery" className="band band-alt" aria-labelledby="delivery-title">
      <div className="band-inner delivery">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2 id="delivery-title">{copy.title}</h2>
        <p className="lead">{copy.intro}</p>
        <ul className="zone-grid">
          {copy.zones.map((zone) => (
            <li key={zone.name}>
              <Icon name="pin" size={21} />
              <strong>{zone.name}</strong>
              <span>{zone.time}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Social({ copy }: { copy: LandingCopy["social"] }) {
  return (
    <section className="band" aria-labelledby="social-title">
      <div className="band-inner">
        <h2 id="social-title">{copy.title}</h2>
        <ul className="gallery">
          {galleryImages.map((src, index) => (
            <li key={src}>
              <Image src={src} alt={`${copy.alt} ${index + 1}`} width={700} height={700} sizes="(max-width: 48rem) 45vw, 15rem" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
