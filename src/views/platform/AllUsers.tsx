import { Card } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useApi } from '@/hooks/useApi';
import { apiGetBusinesses } from '@/services/BusinessService';
import { apiGetUsers } from '@/services/UserMasterService';
import UserTable from '@/views/user-management/UserTable';

export default function AllUsers() {
  const { t } = useLanguage();
  const users = useApi(apiGetUsers);
  const businesses = useApi(apiGetBusinesses);
  if (!users.data || !businesses.data) return <Spinner />;
  return (
    <>
      <PageHeader title={t('nav.allUsers')} subtitle={t('platform.usersSub', { n: users.data.length, b: businesses.data.length })} />
      <Card pad={false}>
        <UserTable users={users.data} businesses={businesses.data} onChanged={users.reload} />
      </Card>
    </>
  );
}
