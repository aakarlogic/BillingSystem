import { Card } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useApi } from '@/hooks/useApi';
import { apiGetPlans, apiGetSettings } from '@/services/BusinessService';
import { apiGetUsers } from '@/services/UserMasterService';
import UserTable from './UserTable';

export default function Team() {
  const { t } = useLanguage();
  const users = useApi(apiGetUsers);
  const settings = useApi(apiGetSettings);
  const plans = useApi(apiGetPlans);
  if (!users.data || !settings.data || !plans.data) return <Spinner />;
  const plan = plans.data.find((p) => p.planId === settings.data?.planId);
  const active = users.data.filter((u) => u.isActive).length;

  return (
    <>
      <PageHeader title={t('nav.team')} subtitle={t('team.seats', { used: active, max: plan?.maxUsers ?? '∞', plan: plan?.planName ?? '' })} />
      <Card pad={false}>
        <UserTable users={users.data} onChanged={users.reload} />
      </Card>
    </>
  );
}
