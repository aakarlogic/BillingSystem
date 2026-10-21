import type { ReactNode } from 'react';
import Icon from './icon';

type CardProps = { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean };

export function Card({ title, actions, children, className = '', pad = true }: CardProps) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </header>
      )}
      <div className={pad ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

type StatProps = { label: string; value: ReactNode; sub?: ReactNode; icon?: string; tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info' };

export function Stat({ label, value, sub, icon, tone = 'primary' }: StatProps) {
  return (
    <div className="stat">
      {icon && (
        <div className={`stat-icon tone-${tone}`}>
          <Icon name={icon} size={20} />
        </div>
      )}
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon = 'invoice', title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <h3>{title}</h3>
      {text && <p className="muted">{text}</p>}
      {action}
    </div>
  );
}
