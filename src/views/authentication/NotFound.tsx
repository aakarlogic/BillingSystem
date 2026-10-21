import { Link } from 'react-router';
import Button from '@/components/ui/button';
import { Empty } from '@/components/ui/card';
import { useLanguage } from '@/context/LanguageContext';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="notfound">
      <Empty
        icon="search"
        title={t('errors.notFoundTitle')}
        text={t('errors.notFoundText')}
        action={
          <Link to="/">
            <Button>{t('common.backHome')}</Button>
          </Link>
        }
      />
    </div>
  );
}
