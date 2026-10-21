import { Link } from 'react-router';

type LogoProps = { to?: string; sub?: string | null; showLatin?: boolean };

/** पावती mark + name. */
export default function Logo({ to = '/', sub, showLatin = false }: LogoProps) {
  return (
    <Link to={to} className="brand">
      <div className="brand-mark">प</div>
      <div className="brand-text">
        <div className="brand-name">
          पावती{showLatin && <small className="brand-latin">Pavti</small>}
        </div>
        {sub && <div className="brand-sub">{sub}</div>}
      </div>
    </Link>
  );
}
