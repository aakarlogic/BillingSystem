import { RouterProvider } from 'react-router';
import { ToastProvider } from '@/components/ui/toast';
import { LanguageProvider } from '@/context/LanguageContext';
import { UserDataProvider } from '@/context/UserDataContext';
import router from '@/routes/Router';

export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <UserDataProvider>
          <RouterProvider router={router} />
        </UserDataProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
