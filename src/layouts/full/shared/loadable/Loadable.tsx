import { Suspense, type ComponentType } from 'react';
import Spinner from '@/components/ui/spinner';

// Lazy-loading wrapper used in routes/Router.tsx (same pattern as Health 360).
const Loadable =
  <P extends object>(Component: ComponentType<P>) =>
  (props: P) => (
    <Suspense fallback={<Spinner />}>
      <Component {...props} />
    </Suspense>
  );

export default Loadable;
