import App from './App';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { AlumniForm } from './components/AlumniForm';
import { StartupForm } from './components/StartupForm';
import { Toaster } from 'sonner';

export default function Root() {
  if (window.location.pathname === '/alumni-form') {
    return (
      <>
        <AlumniForm />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (window.location.pathname === '/startup-form') {
    return (
      <>
        <StartupForm />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  if (window.location.pathname === '/verify-email') {
    return (
      <>
        <VerifyEmailPage />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <>
      <App />
      <Toaster position="top-right" richColors />
    </>
  );
}
