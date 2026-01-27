import App from './App';
import { VerifyEmailPage } from './components/VerifyEmailPage';
import { AlumniForm } from './components/AlumniForm';

export default function Root() {
  if (window.location.pathname === '/alumni-form') {
    return <AlumniForm />;
  }

  if (window.location.pathname === '/verify-email') {
    return <VerifyEmailPage />;
  }

  return <App />;
}
