import { Link } from 'react-router';
import Button from '@/components/ui/button';
import { Empty } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';

export default function UnauthorizedPage() {
  const { t } = useLanguage();
  return (
    <Empty
      icon="shield"
      title={t('errors.noAccessTitle')}
      text={t('errors.noAccessText')}
      action={
        <Link to="/dashboard">
          <Button>{t('common.goDashboard')}</Button>
        </Link>
      }
    />
  );
}
