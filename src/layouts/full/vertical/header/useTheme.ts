import { useEffect, useState } from 'react';

const KEY = 'pavti_theme';

/** Light/dark switch; empty = follow the device. */
export function useTheme(): [boolean, () => void] {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return localStorage.getItem(KEY) ?? '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  const isDark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  return [isDark, () => setTheme(isDark ? 'light' : 'dark')];
}
