<<<<<<< HEAD
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
=======
import { AppRouter } from './app/AppRouter';
import { Toaster } from 'sonner';

export default function Root() {
  return (
    <>
      <AppRouter />
>>>>>>> d6770a6c5839df08cc3a49078206a5268cc7140b
      <Toaster position="top-right" richColors />
    </>
  );
}
