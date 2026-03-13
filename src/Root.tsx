import { AppRouter } from './app/AppRouter';
import { Toaster } from 'sonner';

export default function Root() {
  return (
    <>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </>
  );
}
