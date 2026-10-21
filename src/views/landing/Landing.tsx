import { useState } from 'react';
import { Link } from 'react-router';
import Icon from '@/components/ui/icon';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import FoodRow from '@/components/landingpage/FoodRow';
import { PHOTOS } from '@/components/landingpage/photos';
import { useLanguage } from '@/context/LanguageContext';
import { useApi } from '@/hooks/useApi';
import { apiGetPlans } from '@/services/BusinessService';
import { formatMoney } from '@/utils/money';

type Feature = { title: string; text: string };
type RoleCard = { who: string; points: string[] };
type Faq = { q: string; a: string };
type Translate = (key: string, vars?: Record<string, string | number>) => string;

const FEATURE_ICONS = ['invoice', 'wallet', 'chart', 'shield', 'building', 'globe'];
const ROLE_META = [
  { key: 'super_admin', tone: 'pink', icon: 'layers' },
  { key: 'admin', tone: 'indigo', icon: 'settings' },
  { key: 'user', tone: 'green', icon: 'user' },
];
const FLOW_ICONS = ['box', 'plus', 'invoice', 'wallet', 'chart'];

function HeroPhoto({ t }: { t: Translate }) {
  return (
    <div className="hero-photo">
      <img
        className="hero-img"
        src={PHOTOS.dosaThali(900, 1000)}
        srcSet={`${PHOTOS.dosaThali(600, 680)} 600w, ${PHOTOS.dosaThali(900, 1000)} 900w`}
        sizes="(max-width: 760px) 100vw, 520px"
        alt="Masala dosa with chutneys and sambar"
        fetchPriority="high"
      />
      <div className="hero-chip"><span className="dot" /> Table 4 · 2 min</div>
      <div className="mock-float mock-float-b" aria-hidden="true">
        <small>Spice Garden Cafe</small>
        <strong>SGC-00031 · Table 4</strong>
        <div className="mf-line"><span>Masala Dosa × 2</span><span>₹360.00</span></div>
        <div className="mf-line"><span>Filter Coffee × 2</span><span>₹126.00</span></div>
        <div className="mf-line"><span>GST 5% + Service 5%</span><span>₹48.60</span></div>
        <div className="mf-line total"><span>Total</span><span>₹534.60</span></div>
      </div>
      <div className="mock-float mock-float-a" aria-hidden="true">
        <div className="mf-icon"><Icon name="check" size={16} /></div>
        <div>
          <strong>{t('statusCode.PAID')}</strong>
          <small>UPI · ₹534.60</small>
        </div>
      </div>
    </div>
  );
}

function PhotoStrip({ t }: { t: Translate }) {
  const items = [
    { img: PHOTOS.restaurant, title: t('landing.photos.tables'), alt: 'Restaurant with tables' },
    { img: PHOTOS.dosaLeaf, title: t('landing.photos.menu'), alt: 'Dosa on a banana leaf' },
    { img: PHOTOS.phonePay, title: t('landing.photos.pay'), alt: 'Customer paying by phone' },
  ];
  return (
    <div className="photo-strip">
      {items.map((p, i) => (
        <figure key={i} className="photo-card">
          <img src={p.img(640, 480)} alt={p.alt} loading="lazy" />
          <figcaption><span>{i + 1}</span>{p.title}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function Landing() {
  const { t, tl } = useLanguage();
  const L = (k: string, v?: Record<string, string | number>) => t(`landing.${k}`, v);
  const plans = useApi(apiGetPlans).data ?? [];
  const [menu, setMenu] = useState(false);
  const [open, setOpen] = useState(0);
  const featured = plans[Math.min(1, plans.length - 1)]?.planId;

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp">
      <header className={`lp-nav ${menu ? 'open' : ''}`}>
        <div className="lp-wrap lp-nav-inner">
          <a href="#top" onClick={scrollTo('top')} className="lp-logo">
            <div className="brand-mark">प</div>
            <span className="brand-word">पावती<small>Pavti</small></span>
          </a>
          <nav className="lp-links">
            <a href="#features" onClick={scrollTo('features')}>{L('nav.features')}</a>
            <a href="#roles" onClick={scrollTo('roles')}>{L('nav.roles')}</a>
            <a href="#restaurants" onClick={scrollTo('restaurants')}>{L('nav.restaurants')}</a>
            <a href="#pricing" onClick={scrollTo('pricing')}>{L('nav.pricing')}</a>
            <Link to="/guide">{t('nav.guide')}</Link>
          </nav>
          <div className="lp-nav-cta">
            <LanguageSwitcher />
            <Link to="/auth/login" className="lp-btn lp-btn-ghost">{t('common.signIn')}</Link>
            <Link to="/auth/login" className="lp-btn lp-btn-primary">{t('common.tryDemo')}</Link>
          </div>
          <span className="lp-lang-mobile"><LanguageSwitcher compact /></span>
          <button type="button" className="icon-btn lp-burger" onClick={() => setMenu(!menu)} aria-label="Menu">
            <Icon name={menu ? 'x' : 'menu'} />
          </button>
        </div>
      </header>

      <section className="lp-hero" id="top">
        <div className="lp-glow" />
        <div className="lp-wrap lp-hero-grid">
          <div className="lp-hero-text">
            <span className="lp-eyebrow"><span className="dot" /> {L('eyebrow')}</span>
            <h1>{L('h1a')} <span className="grad">{L('h1b')}</span></h1>
            <p>{L('sub')}</p>
            <div className="lp-hero-cta">
              <Link to="/auth/login" className="lp-btn lp-btn-primary lp-btn-lg">{L('ctaDemo')} <Icon name="back" size={16} className="flip" /></Link>
              <Link to="/guide" className="lp-btn lp-btn-ghost lp-btn-lg">{L('ctaGuide')}</Link>
            </div>
            <div className="lp-trust">
              {tl<[string, string][]>('landing.trust').map(([n, label]) => (
                <div key={label}><strong>{n}</strong><span>{label}</span></div>
              ))}
            </div>
          </div>
          <HeroPhoto t={t} />
        </div>
      </section>

      <FoodRow />

      <section className="lp-section" id="features">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">{L('featuresKicker')}</span>
            <h2>{L('featuresTitle')}</h2>
            <p>{L('featuresSub')}</p>
          </div>
          <div className="lp-features">
            {tl<Feature[]>('landing.features').map((f, i) => (
              <div key={f.title} className="lp-feature">
                <div className="lp-ficon"><Icon name={FEATURE_ICONS[i]} size={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-alt" id="roles">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">{L('rolesKicker')}</span>
            <h2>{L('rolesTitle')}</h2>
            <p>{L('rolesSub')}</p>
          </div>
          <div className="lp-roles">
            {tl<RoleCard[]>('landing.roles').map((r, i) => (
              <div key={ROLE_META[i].key} className={`lp-role tone-${ROLE_META[i].tone}`}>
                <div className="lp-role-top">
                  <div className="lp-role-icon"><Icon name={ROLE_META[i].icon} size={20} /></div>
                  <div>
                    <h3>{t(`roles.${ROLE_META[i].key}`)}</h3>
                    <span>{r.who}</span>
                  </div>
                </div>
                <ul>
                  {r.points.map((p) => (
                    <li key={p}><Icon name="check" size={15} /> {p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="restaurants">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">{L('restKicker')}</span>
            <h2>{L('restTitle')}</h2>
            <p>{L('restSub')}</p>
          </div>
          <ol className="lp-flow">
            {tl<Feature[]>('landing.flow').map((s, i) => (
              <li key={s.title}>
                <div className="lp-step-num">{i + 1}</div>
                <div className="lp-step-icon"><Icon name={FLOW_ICONS[i]} size={22} /></div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <PhotoStrip t={t} />
          <div className="lp-split">
            <div>
              <h3>{L('busyTitle')}</h3>
              <ul className="lp-checks">
                {tl<string[]>('landing.busy').map((b) => (
                  <li key={b}><Icon name="check" size={16} /> {b}</li>
                ))}
              </ul>
              <Link to="/guide" className="lp-btn lp-btn-primary" style={{ marginTop: 24 }}>
                {L('guideLink')} <Icon name="back" size={16} className="flip" />
              </Link>
            </div>
            <div className="lp-receipt">
              <div className="r-head"><strong>Spice Garden Cafe</strong><small>Table 4 · 20 Oct 2026</small></div>
              {[['Masala Dosa', '2 × ₹180', '₹360'], ['Paneer Tikka', '1 × ₹399', '₹399'], ['Filter Coffee', '3 × ₹63', '₹189']].map(([a, b, c]) => (
                <div key={a} className="r-line"><span>{a}<small>{b}</small></span><span>{c}</span></div>
              ))}
              <div className="r-line sub"><span>Subtotal</span><span>₹948.00</span></div>
              <div className="r-line sub"><span>GST 5%</span><span>₹47.40</span></div>
              <div className="r-line sub"><span>Service charge 5%</span><span>₹47.40</span></div>
              <div className="r-line total"><span>Total</span><span>₹1,042.80</span></div>
              <div className="r-paid">PAID · UPI</div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-alt" id="pricing">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">{L('pricingKicker')}</span>
            <h2>{L('pricingTitle')}</h2>
            <p>{L('pricingSub')}</p>
          </div>
          <div className="lp-plans">
            {plans.map((p) => (
              <div key={p.planId} className={`lp-plan ${p.planId === featured ? 'featured' : ''}`}>
                {p.planId === featured && <span className="lp-badge">{L('popular')}</span>}
                <h3>{p.planName}</h3>
                <p className="lp-plan-desc">{p.description}</p>
                <div className="lp-price">{formatMoney(p.monthlyPrice, 'INR').replace(/\.00$/, '')}<span>{L('perMonth')}</span></div>
                <ul>
                  {tl<string[]>('landing.planPoints').map((pt) => (
                    <li key={pt}><Icon name="check" size={15} /> {pt.replace('{n}', String(p.maxUsers))}</li>
                  ))}
                </ul>
                <Link to="/auth/login" className={`lp-btn ${p.planId === featured ? 'lp-btn-primary' : 'lp-btn-ghost'} lp-btn-block`}>
                  {L('startWith', { name: p.planName })}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="faq">
        <div className="lp-wrap lp-faq-wrap">
          <div className="lp-head left">
            <span className="lp-kicker">{L('faqKicker')}</span>
            <h2>{L('faqTitle')}</h2>
          </div>
          <div className="lp-faq">
            {tl<Faq[]>('landing.faq').map(({ q, a }, i) => (
              <div key={q} className={`lp-q ${open === i ? 'open' : ''}`}>
                <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                  {q}
                  <Icon name={open === i ? 'minus' : 'plus'} size={18} />
                </button>
                {open === i && <p>{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-wrap lp-cta-inner">
          <div>
            <h2>{L('ctaTitle')}</h2>
            <p>{L('ctaSub')}</p>
          </div>
          <Link to="/auth/login" className="lp-btn lp-btn-white lp-btn-lg">{L('ctaBtn')}</Link>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div className="lp-logo">
            <div className="brand-mark">प</div>
            <span className="brand-word">पावती<small>Pavti</small></span>
          </div>
          <span className="muted">{L('footer')}</span>
          <span className="photo-credit">Photos: <a className="link" href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a></span>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link to="/guide" className="link">{t('nav.guide')}</Link>
            <Link to="/auth/login" className="link">{t('common.signIn')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
