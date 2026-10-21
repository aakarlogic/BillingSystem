import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Icon from '@/components/ui/icon';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';

type Person = { name: string; login: string; does: string };
type Step = { title: string; who: string; where: string; text: string; tip?: string };
type StatusCard = { name: string; text: string };
type Case = { q: string; a: string };

const PEOPLE_ICONS = ['chart', 'settings', 'invoice', 'wallet'];
const SETUP_ICONS = ['building', 'settings', 'box', 'users'];
const DAY_ICONS = ['contact', 'plus', 'edit', 'invoice', 'wallet', 'check'];
const STATUS_TONES = ['free', 'busy', 'pending', 'paid'];
const CASE_ICONS = ['x', 'card', 'trash', 'refund', 'clock', 'edit'];
const SECTIONS = ['who', 'setup', 'day', 'status', 'cases', 'end'];

function Section({ id, n, title, sub, children }: { id: string; n: number; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} className="g-section">
      <div className="g-sec-head">
        <span className="g-sec-num">{n}</span>
        <div>
          <h2>{title}</h2>
          {sub && <p className="muted">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function RestaurantGuide() {
  const { t, tl } = useLanguage();
  const { user } = useUserData();
  const g = (k: string) => t(`guide.${k}`);
  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp guide">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <Link to="/" className="lp-logo">
            <div className="brand-mark">प</div>
            <span className="brand-word">पावती<small>Pavti</small></span>
          </Link>
          <div className="spacer" />
          <LanguageSwitcher />
          {user ? (
            <Link to="/dashboard" className="lp-btn lp-btn-primary">{t('common.goDashboard')}</Link>
          ) : (
            <Link to="/auth/login" className="lp-btn lp-btn-primary g-hide-sm">{g('tryDemo')}</Link>
          )}
        </div>
      </header>

      <section className="g-hero">
        <div className="lp-glow" />
        <div className="lp-wrap g-hero-inner">
          <span className="lp-eyebrow"><span className="dot" /> {g('kicker')}</span>
          <h1>{g('title')}</h1>
          <p>{g('sub')}</p>
          <nav className="g-toc">
            {tl<string[]>('guide.toc').map((label, i) => (
              <a key={label} href={`#${SECTIONS[i]}`} onClick={jump(SECTIONS[i])}>
                <span>{i + 1}</span>
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <div className="lp-wrap g-body">
        <Section id="who" n={1} title={g('whoTitle')} sub={g('whoSub')}>
          <div className="g-people">
            {tl<Person[]>('guide.people').map((p, i) => (
              <div key={p.name} className="g-person">
                <div className="g-person-icon"><Icon name={PEOPLE_ICONS[i]} size={22} /></div>
                <h3>{p.name}</h3>
                <span className={`g-login ${i < 2 ? 'admin' : 'user'}`}>{p.login}</span>
                <p>{p.does}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="setup" n={2} title={g('setupTitle')} sub={g('setupSub')}>
          <div className="g-setup">
            {tl<Step[]>('guide.setup').map((s, i) => (
              <div key={s.title} className="g-card">
                <div className="g-card-top">
                  <div className="g-step-icon"><Icon name={SETUP_ICONS[i]} size={20} /></div>
                  <span className="g-step-label">{i + 1}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <div className="g-meta">
                  <span><Icon name="user" size={13} /> {s.who}</span>
                  <span><Icon name="dashboard" size={13} /> {s.where}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="day" n={3} title={g('dayTitle')} sub={g('daySub')}>
          <ol className="g-timeline">
            {tl<Step[]>('guide.day').map((s, i) => (
              <li key={s.title}>
                <div className="g-dot"><Icon name={DAY_ICONS[i]} size={18} /></div>
                <div className="g-tl-card">
                  <div className="g-tl-head">
                    <h3>{s.title}</h3>
                    <span className="g-who">{s.who}</span>
                  </div>
                  <p>{s.text}</p>
                  {s.where && s.where !== '—' && (
                    <div className="g-where"><strong>{t('common.where')}:</strong> {s.where}</div>
                  )}
                  {s.tip && (
                    <div className="g-tip"><span>💡 {t('common.tip')}</span> {s.tip}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="status" n={4} title={g('statusTitle')}>
          <div className="g-status">
            {tl<StatusCard[]>('guide.statuses').map((s, i) => (
              <div key={i} className={`g-table ${STATUS_TONES[i]}`}>
                <div className="g-table-top">
                  <span className="g-table-no">T4</span>
                  <span className="g-light" />
                </div>
                <strong>{s.name}</strong>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="cases" n={5} title={g('casesTitle')} sub={g('casesSub')}>
          <div className="g-cases">
            {tl<Case[]>('guide.cases').map((c, i) => (
              <div key={c.q} className="g-case">
                <div className="g-case-icon"><Icon name={CASE_ICONS[i]} size={18} /></div>
                <div>
                  <h3>{c.q}</h3>
                  <p>{c.a}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="end" n={6} title={g('endTitle')} sub={g('endSub')}>
          <ul className="g-check">
            {tl<string[]>('guide.end').map((item, i) => (
              <li key={i}>
                <span className="g-box"><Icon name="check" size={14} /></span>
                {item}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <section className="lp-cta">
        <div className="lp-wrap lp-cta-inner">
          <div>
            <h2>{g('ctaTitle')}</h2>
            <p>{g('ctaSub')}</p>
          </div>
          <Link to={user ? '/dashboard' : '/auth/login'} className="lp-btn lp-btn-white lp-btn-lg">
            {user ? t('common.goDashboard') : g('tryDemo')}
          </Link>
        </div>
      </section>
    </div>
  );
}
