import { useLanguage } from '@/context/LanguageContext';
import { sizedImage } from '@/components/shared/DishImage';
import { MENU_SHOWCASE } from './photos';

// A row of dish cards that slides by on its own. It pauses when hovered, and
// on phones it can also be swiped by hand. The list is drawn twice so the
// loop has no visible jump.
export default function FoodRow() {
  const { t, lang } = useLanguage();
  const cards = (copy: 'a' | 'b') =>
    MENU_SHOWCASE.map((d) => (
      <figure key={`${copy}-${d.name}`} className="food-card" aria-hidden={copy === 'b' || undefined}>
        <img src={sizedImage(d.image, 320, 240)} alt={copy === 'a' ? d.name : ''} loading="lazy" />
        <figcaption>
          <strong>{lang === 'en' ? d.name : d.mr}</strong>
          <span>₹{d.price}</span>
        </figcaption>
      </figure>
    ));

  return (
    <section className="food-row" aria-label={t('landing.foodRow')}>
      <div className="lp-wrap food-row-head">
        <span className="lp-kicker">{t('landing.foodRowKicker')}</span>
        <h2>{t('landing.foodRow')}</h2>
      </div>
      <div className="food-viewport">
        <div className="food-track">
          {cards('a')}
          {cards('b')}
        </div>
      </div>
    </section>
  );
}
