import { useLanguage } from '@/context/LanguageContext';

const TONES: Record<string, string> = {
  OPEN: 'info',
  BILLED: 'warning',
  PART_PAID: 'info',
  PAID: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
  ACTIVE: 'success',
  PENDING: 'warning',
  SUSPENDED: 'danger',
  INACTIVE: 'neutral',
  AVAILABLE: 'success',
  OCCUPIED: 'info',
  BILL_PENDING: 'warning',
};

/** Coloured pill for any status code (order, business, user, table). */
export default function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  return <span className={`badge badge-${TONES[status] ?? 'neutral'}`}>{t(`statusCode.${status}`)}</span>;
}

export function Badge({ tone = 'neutral', children }: { tone?: string; children: React.ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
