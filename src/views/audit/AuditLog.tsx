import { useState } from 'react';
import Button from '@/components/ui/button';
import { Card, Empty } from '@/components/ui/card';
import { SearchBox } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useApi } from '@/hooks/useApi';
import { apiGetAuditLog } from '@/services/ReportService';
import { formatDateTime } from '@/utils/formatDate';
import { downloadCsv } from '@/utils/money';

const tone = (action: string) =>
  /CANCEL|REFUND|SUSPEND|DEACTIVATE|DELETE|REMOVE|SOLD_OUT/.test(action) ? 'danger' : /DISCOUNT|PRICE|UPDATE/.test(action) ? 'warning' : 'neutral';

export default function AuditLog() {
  const { t } = useLanguage();
  const { user, canPage } = useUserData();
  const { data } = useApi(apiGetAuditLog);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(100);
  if (!data) return <Spinner />;
  const isPlatform = user?.roleCode === 'SUPER_ADMIN';
  const rows = data.filter((a) => !q || [a.userName, a.actionCode, a.details, a.reason, a.businessName].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title={t('nav.audit')}
        subtitle={t('audit.sub')}
        actions={
          canPage('AUDIT_LOG', 'export') && (
            <Button
              variant="ghost"
              icon="download"
              onClick={() =>
                downloadCsv('history.csv', [
                  ['Time', 'Person', 'Role', 'Business', 'Action', 'Details', 'Reason'],
                  ...rows.map((a) => [a.actionDate, a.userName, a.roleCode, a.businessName, a.actionCode, a.details, a.reason]),
                ])
              }
            >
              {t('common.export')}
            </Button>
          )
        }
      />
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={t('audit.search')} />
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('audit.time')}</th>
                  <th>{t('team.colPerson')}</th>
                  {isPlatform && <th>{t('dash.businesses')}</th>}
                  <th>{t('audit.action')}</th>
                  <th>{t('audit.details')}</th>
                  <th>{t('common.reason')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, limit).map((a) => (
                  <tr key={a.auditLogId}>
                    <td className="nowrap">{formatDateTime(a.actionDate)}</td>
                    <td>
                      {a.userName}
                      {a.roleCode && <div className="muted small">{t(`roleCode.${a.roleCode}`)}</div>}
                    </td>
                    {isPlatform && <td>{a.businessName}</td>}
                    <td>
                      <Badge tone={tone(a.actionCode)}>{a.actionCode}</Badge>
                    </td>
                    <td>{a.details}</td>
                    <td>{a.reason || <span className="muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > limit && (
              <div className="center pad">
                <Button variant="ghost" onClick={() => setLimit(limit + 100)}>
                  {t('common.showMore')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Empty icon="log" title={t('audit.none')} />
        )}
      </Card>
    </>
  );
}
