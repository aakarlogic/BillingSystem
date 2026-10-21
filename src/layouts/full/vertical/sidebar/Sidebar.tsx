import { NavLink } from 'react-router';
import Icon from '@/components/ui/icon';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import useAuth from '@/utils/hooks/useAuth';
import Logo from '../../shared/logo/Logo';
import { buildSidebar, type SidebarLink } from './menuBinding';

function Item({ link, label }: { link: SidebarLink; label: string }) {
  return (
    <NavLink to={link.to} end={link.end} className="nav-link" title={label}>
      <Icon name={link.icon} />
      <span className="nav-text">{label}</span>
    </NavLink>
  );
}

type SidebarProps = { onClose: () => void };

export default function Sidebar({ onClose }: SidebarProps) {
  const { t } = useLanguage();
  const { user, menu } = useUserData();
  const { signOut } = useAuth();
  const { home, sections, account } = buildSidebar(menu ?? []);
  const workspace = user?.businessName ?? t('nav.platformConsole');

  return (
    <aside className="sidebar">
      <div className="brand-row">
        <Logo to="/dashboard" sub={workspace} />
        <button type="button" className="icon-btn nav-close" onClick={onClose} aria-label={t('nav.closeMenu')}>
          <Icon name="x" />
        </button>
      </div>
      <nav>
        {home && <Item link={home} label={t(home.labelKey)} />}
        {sections.map((s) => (
          <div key={s.group}>
            <div className="nav-section">{t(s.labelKey)}</div>
            {s.links.map((l) => (
              <Item key={l.pageCode} link={l} label={t(l.labelKey)} />
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        {account.map((l) => (
          <Item key={l.pageCode} link={l} label={t(l.labelKey)} />
        ))}
        <button type="button" className="nav-link" title={t('common.signOut')} onClick={() => signOut()}>
          <Icon name="logout" />
          <span className="nav-text">{t('common.signOut')}</span>
        </button>
      </div>
    </aside>
  );
}
