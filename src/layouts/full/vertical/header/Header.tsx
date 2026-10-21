import { NavLink } from 'react-router';
import Icon from '@/components/ui/icon';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { initials } from '@/utils/money';
import { useTheme } from './useTheme';

type HeaderProps = { menuShown: boolean; onToggleMenu: () => void };

export default function Header({ menuShown, onToggleMenu }: HeaderProps) {
  const { t } = useLanguage();
  const { user } = useUserData();
  const [isDark, toggleTheme] = useTheme();
  if (!user) return null;

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn menu-btn"
        onClick={onToggleMenu}
        aria-expanded={menuShown}
        aria-label={menuShown ? t('nav.closeMenu') : t('nav.openMenu')}
        title={menuShown ? t('nav.closeMenu') : t('nav.openMenu')}
      >
        <Icon name="menu" />
      </button>
      <div className="topbar-title">{user.businessName ?? t('nav.platformConsole')}</div>
      <div className="topbar-right">
        <LanguageSwitcher compact />
        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={t('common.theme')} title={t('common.theme')}>
          <Icon name={isDark ? 'sun' : 'moon'} />
        </button>
        <NavLink to="/profile" className="me">
          <div className="avatar">{initials(user.fullName)}</div>
          <div className="me-text">
            <div className="me-name">{user.fullName}</div>
            <div className={`role-pill role-${user.roleCode}`}>{t(`roleCode.${user.roleCode}`)}</div>
          </div>
        </NavLink>
      </div>
    </header>
  );
}
